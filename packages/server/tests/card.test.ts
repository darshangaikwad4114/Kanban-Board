import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../src/models', () => ({
  Board: {
    findById: jest.fn(),
  },
  List: {
    findById: jest.fn(),
  },
  Card: {
    findById: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  ActivityLog: {
    create: jest.fn(),
  },
}));

jest.mock('../src/socket', () => ({
  getIO: jest.fn(() => undefined),
  broadcastCardChange: jest.fn(),
  broadcastActivity: jest.fn(),
}));

import { app } from '../src/app';
import { env } from '../src/config/env';
import { Board, List, Card, ActivityLog } from '../src/models';

type FakeDoc = Record<string, unknown> & {
  _id: string;
  save: jest.Mock;
  toJSON: jest.Mock;
};

const OWNER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439012';
const BOARD_ID = '507f1f77bcf86cd799439021';
const OTHER_BOARD_ID = '507f1f77bcf86cd799439022';
const LIST_ID = '507f1f77bcf86cd799439031';
const LIST_ID_2 = '507f1f77bcf86cd799439032';
const CARD_ID = '507f1f77bcf86cd799439041';

const authHeader = (userId: string, email = 'owner@example.com'): string => {
  const token = jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: '15m' });
  return `Bearer ${token}`;
};

function makeDoc(overrides: Partial<FakeDoc> = {}): FakeDoc {
  const doc = {
    _id: CARD_ID,
    save: jest.fn().mockResolvedValue(undefined),
    toJSON: jest.fn(),
    ...overrides,
  } as FakeDoc;
  doc.toJSON.mockImplementation(() => {
    const { save, toJSON, ...rest } = doc;
    return rest;
  });
  return doc;
}

function makeBoardDoc(overrides: Partial<FakeDoc> = {}): FakeDoc {
  return makeDoc({
    _id: BOARD_ID,
    ownerId: OWNER_ID,
    memberIds: [OWNER_ID],
    ...overrides,
  });
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/cards', () => {
  it('returns 404 when the board does not exist', async () => {
    (Board.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/cards')
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'Card', listId: LIST_ID, boardId: BOARD_ID });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BOARD_NOT_FOUND');
  });

  it('returns 403 when the requester is not a board member', async () => {
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());

    const res = await request(app)
      .post('/api/cards')
      .set('Authorization', authHeader(OTHER_USER_ID))
      .send({ title: 'Card', listId: LIST_ID, boardId: BOARD_ID });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('returns 400 when the list does not belong to the referenced board', async () => {
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());
    (List.findById as jest.Mock).mockResolvedValue(
      makeDoc({ _id: LIST_ID, boardId: OTHER_BOARD_ID })
    );

    const res = await request(app)
      .post('/api/cards')
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'Card', listId: LIST_ID, boardId: BOARD_ID });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_LIST');
    expect(Card.create).not.toHaveBeenCalled();
  });

  it('creates the card when the board, membership, and list are valid', async () => {
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());
    (List.findById as jest.Mock).mockResolvedValue(makeDoc({ _id: LIST_ID, boardId: BOARD_ID }));
    (Card.countDocuments as jest.Mock).mockResolvedValue(0);
    (Card.create as jest.Mock).mockResolvedValue(
      makeDoc({ title: 'Card', listId: LIST_ID, boardId: BOARD_ID, position: 0 })
    );
    (ActivityLog.create as jest.Mock).mockResolvedValue(makeDoc());

    const res = await request(app)
      .post('/api/cards')
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'Card', listId: LIST_ID, boardId: BOARD_ID });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Card');
  });
});

describe('PATCH /api/cards/:id', () => {
  it('applies only the fields provided in the request body', async () => {
    const cardDoc = makeDoc({
      title: 'Old title',
      description: 'Old description',
      position: 0,
      listId: LIST_ID,
      boardId: BOARD_ID,
      priority: 'none',
      assigneeId: null,
      dueDate: null,
      label: null,
    });
    (Card.findById as jest.Mock).mockResolvedValue(cardDoc);
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());
    (ActivityLog.create as jest.Mock).mockResolvedValue(makeDoc());

    const res = await request(app)
      .patch(`/api/cards/${CARD_ID}`)
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'New title' });

    expect(res.status).toBe(200);
    expect(cardDoc.title).toBe('New title');
    expect(cardDoc.description).toBe('Old description');
    expect(cardDoc.priority).toBe('none');
    expect(cardDoc.save).toHaveBeenCalled();
  });
});

describe('DELETE /api/cards/:id', () => {
  it('removes the card and closes the position gap', async () => {
    const cardDoc = makeDoc({
      title: 'To delete',
      position: 2,
      listId: LIST_ID,
      boardId: BOARD_ID,
    });
    (Card.findById as jest.Mock).mockResolvedValue(cardDoc);
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());
    (Card.findByIdAndDelete as jest.Mock).mockResolvedValue(cardDoc);
    (Card.updateMany as jest.Mock).mockResolvedValue({});
    (ActivityLog.create as jest.Mock).mockResolvedValue(makeDoc());

    const res = await request(app)
      .delete(`/api/cards/${CARD_ID}`)
      .set('Authorization', authHeader(OWNER_ID));

    expect(res.status).toBe(200);
    expect(Card.findByIdAndDelete).toHaveBeenCalledWith(CARD_ID);
    expect(Card.updateMany).toHaveBeenCalledWith(
      { listId: LIST_ID, position: { $gt: 2 } },
      { $inc: { position: -1 } }
    );
  });
});

describe('POST /api/cards/:id/move validation', () => {
  it('rejects a move missing targetListId and newPosition with 400', async () => {
    const res = await request(app)
      .post(`/api/cards/${CARD_ID}/move`)
      .set('Authorization', authHeader(OWNER_ID))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Card.findById).not.toHaveBeenCalled();
  });

  it('rejects a move with a negative newPosition with 400', async () => {
    const res = await request(app)
      .post(`/api/cards/${CARD_ID}/move`)
      .set('Authorization', authHeader(OWNER_ID))
      .send({ targetListId: LIST_ID_2, newPosition: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Card.findById).not.toHaveBeenCalled();
  });
});
