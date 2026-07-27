import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../src/models', () => ({
  Board: {
    findById: jest.fn(),
  },
  List: {
    findById: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
  Card: {
    find: jest.fn(),
    deleteMany: jest.fn(),
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
const LIST_ID = '507f1f77bcf86cd799439031';

const authHeader = (userId: string, email = 'owner@example.com'): string => {
  const token = jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: '15m' });
  return `Bearer ${token}`;
};

function makeDoc(overrides: Partial<FakeDoc> = {}): FakeDoc {
  const doc = {
    _id: LIST_ID,
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

describe('POST /api/lists', () => {
  it('returns 403 when the requester is not a board member', async () => {
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());

    const res = await request(app)
      .post('/api/lists')
      .set('Authorization', authHeader(OTHER_USER_ID))
      .send({ title: 'To Do', boardId: BOARD_ID });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
    expect(List.create).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR when the title is missing', async () => {
    const res = await request(app)
      .post('/api/lists')
      .set('Authorization', authHeader(OWNER_ID))
      .send({ boardId: BOARD_ID });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Board.findById).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR for a negative position', async () => {
    const res = await request(app)
      .post('/api/lists')
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'To Do', boardId: BOARD_ID, position: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Board.findById).not.toHaveBeenCalled();
  });

  it('creates the list for a board member', async () => {
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());
    (List.countDocuments as jest.Mock).mockResolvedValue(0);
    (List.create as jest.Mock).mockResolvedValue(
      makeDoc({ title: 'To Do', boardId: BOARD_ID, position: 0 })
    );
    (ActivityLog.create as jest.Mock).mockResolvedValue(makeDoc());

    const res = await request(app)
      .post('/api/lists')
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'To Do', boardId: BOARD_ID });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('To Do');
  });
});

describe('PATCH /api/lists/:id', () => {
  it('returns 403 when the requester is not a board member', async () => {
    (List.findById as jest.Mock).mockResolvedValue(makeDoc({ boardId: BOARD_ID }));
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());

    const res = await request(app)
      .patch(`/api/lists/${LIST_ID}`)
      .set('Authorization', authHeader(OTHER_USER_ID))
      .send({ title: 'Renamed' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('returns 400 VALIDATION_ERROR for a negative position', async () => {
    const res = await request(app)
      .patch(`/api/lists/${LIST_ID}`)
      .set('Authorization', authHeader(OWNER_ID))
      .send({ position: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(List.findById).not.toHaveBeenCalled();
  });

  it('updates the list for a board member', async () => {
    const listDoc = makeDoc({ title: 'Old title', boardId: BOARD_ID, position: 0 });
    (List.findById as jest.Mock).mockResolvedValue(listDoc);
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());

    const res = await request(app)
      .patch(`/api/lists/${LIST_ID}`)
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'New title' });

    expect(res.status).toBe(200);
    expect(listDoc.title).toBe('New title');
    expect(listDoc.save).toHaveBeenCalled();
  });
});

describe('DELETE /api/lists/:id', () => {
  it('returns 403 when the requester is not a board member', async () => {
    (List.findById as jest.Mock).mockResolvedValue(makeDoc({ boardId: BOARD_ID }));
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());

    const res = await request(app)
      .delete(`/api/lists/${LIST_ID}`)
      .set('Authorization', authHeader(OTHER_USER_ID));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
    expect(List.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('deletes the list and its cards for a board member', async () => {
    const listDoc = makeDoc({ title: 'To Do', boardId: BOARD_ID });
    (List.findById as jest.Mock).mockResolvedValue(listDoc);
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());
    (Card.find as jest.Mock).mockResolvedValue([]);
    (Card.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 0 });
    (List.findByIdAndDelete as jest.Mock).mockResolvedValue(listDoc);
    (ActivityLog.create as jest.Mock).mockResolvedValue(makeDoc());

    const res = await request(app)
      .delete(`/api/lists/${LIST_ID}`)
      .set('Authorization', authHeader(OWNER_ID));

    expect(res.status).toBe(200);
    expect(Card.deleteMany).toHaveBeenCalledWith({ listId: LIST_ID });
    expect(List.findByIdAndDelete).toHaveBeenCalledWith(LIST_ID);
  });
});
