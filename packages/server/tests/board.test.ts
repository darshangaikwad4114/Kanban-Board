import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../src/models', () => ({
  Board: {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  },
  List: {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    deleteMany: jest.fn(),
  },
  Card: {
    findById: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    updateMany: jest.fn(),
    findByIdAndDelete: jest.fn(),
    deleteMany: jest.fn(),
  },
  ActivityLog: {
    create: jest.fn(),
    find: jest.fn(),
    deleteMany: jest.fn(),
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

const authHeader = (userId: string, email = 'owner@example.com'): string => {
  const token = jwt.sign({ userId, email }, env.JWT_SECRET, { expiresIn: '15m' });
  return `Bearer ${token}`;
};

function makeDoc(overrides: Partial<FakeDoc> = {}): FakeDoc {
  const doc = {
    _id: BOARD_ID,
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
    title: 'My Board',
    description: '',
    color: 'lavender',
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

describe('POST /api/boards', () => {
  it('creates a board without a template', async () => {
    (Board.create as jest.Mock).mockResolvedValue(makeBoardDoc());

    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'My Board' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('My Board');
    expect(res.body.data.lists).toEqual([]);
    expect(res.body.data.cards).toEqual([]);
    expect(List.create).not.toHaveBeenCalled();
    expect(Card.create).not.toHaveBeenCalled();
  });

  it('creates a board from a template, seeding its lists and cards', async () => {
    (Board.create as jest.Mock).mockResolvedValue(makeBoardDoc({ templateId: 'basic-kanban' }));
    (List.create as jest.Mock).mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(makeDoc(data as Partial<FakeDoc>))
    );
    (Card.create as jest.Mock).mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve(makeDoc(data as Partial<FakeDoc>))
    );
    (ActivityLog.create as jest.Mock).mockResolvedValue(makeDoc());

    const res = await request(app)
      .post('/api/boards')
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'From Template', templateId: 'basic-kanban' });

    expect(res.status).toBe(201);
    expect(List.create).toHaveBeenCalledTimes(3);
    expect(Card.create).toHaveBeenCalledTimes(3);
    expect(ActivityLog.create).toHaveBeenCalledTimes(1);
    expect(res.body.data.lists).toHaveLength(3);
    expect(res.body.data.cards).toHaveLength(3);
  });
});

describe('GET /api/boards', () => {
  it('returns boards scoped to the owner/member with pagination', async () => {
    const boards = [makeBoardDoc(), makeBoardDoc({ _id: 'board-2' })];
    const mockSort = jest.fn().mockReturnThis();
    const mockSkip = jest.fn().mockReturnThis();
    const mockLimit = jest.fn().mockResolvedValue(boards);
    (Board.find as jest.Mock).mockReturnValue({ sort: mockSort, skip: mockSkip, limit: mockLimit });
    (Board.countDocuments as jest.Mock).mockResolvedValue(2);

    const res = await request(app).get('/api/boards').set('Authorization', authHeader(OWNER_ID));

    expect(res.status).toBe(200);
    expect(Board.find).toHaveBeenCalledWith({
      $or: [{ ownerId: OWNER_ID }, { memberIds: OWNER_ID }],
    });
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(2);
    expect(res.body.pagination.page).toBe(1);
  });
});

describe('GET /api/boards/:id', () => {
  it('returns 404 when the board does not exist', async () => {
    (Board.findById as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/boards/${BOARD_ID}`)
      .set('Authorization', authHeader(OWNER_ID));

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('BOARD_NOT_FOUND');
  });

  it('returns 403 when the requester is neither owner nor member', async () => {
    (Board.findById as jest.Mock).mockResolvedValue(
      makeBoardDoc({ ownerId: OWNER_ID, memberIds: [OWNER_ID] })
    );

    const res = await request(app)
      .get(`/api/boards/${BOARD_ID}`)
      .set('Authorization', authHeader(OTHER_USER_ID));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
  });

  it('returns the board with its lists, cards, and activity logs for a member', async () => {
    (Board.findById as jest.Mock).mockResolvedValue(makeBoardDoc());
    (List.find as jest.Mock).mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    (Card.find as jest.Mock).mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    (ActivityLog.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
    });

    const res = await request(app)
      .get(`/api/boards/${BOARD_ID}`)
      .set('Authorization', authHeader(OWNER_ID));

    expect(res.status).toBe(200);
    expect(res.body.data.board.title).toBe('My Board');
  });
});

describe('PATCH /api/boards/:id', () => {
  it('rejects updates from a non-owner with 403', async () => {
    const boardDoc = makeBoardDoc({ ownerId: OWNER_ID, memberIds: [OWNER_ID, OTHER_USER_ID] });
    (Board.findById as jest.Mock).mockResolvedValue(boardDoc);

    const res = await request(app)
      .patch(`/api/boards/${BOARD_ID}`)
      .set('Authorization', authHeader(OTHER_USER_ID))
      .send({ title: 'Renamed' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCESS_DENIED');
    expect(boardDoc.save).not.toHaveBeenCalled();
  });

  it('allows the owner to update the board', async () => {
    const boardDoc = makeBoardDoc({ ownerId: OWNER_ID, memberIds: [OWNER_ID] });
    (Board.findById as jest.Mock).mockResolvedValue(boardDoc);

    const res = await request(app)
      .patch(`/api/boards/${BOARD_ID}`)
      .set('Authorization', authHeader(OWNER_ID))
      .send({ title: 'Renamed' });

    expect(res.status).toBe(200);
    expect(boardDoc.save).toHaveBeenCalled();
    expect(boardDoc.title).toBe('Renamed');
  });
});

describe('DELETE /api/boards/:id', () => {
  it('rejects deletes from a non-owner with 403', async () => {
    const boardDoc = makeBoardDoc({ ownerId: OWNER_ID, memberIds: [OWNER_ID, OTHER_USER_ID] });
    (Board.findById as jest.Mock).mockResolvedValue(boardDoc);

    const res = await request(app)
      .delete(`/api/boards/${BOARD_ID}`)
      .set('Authorization', authHeader(OTHER_USER_ID));

    expect(res.status).toBe(403);
    expect(Board.findByIdAndDelete).not.toHaveBeenCalled();
  });

  it('cascades deletes to lists, cards, and activity logs for the owner', async () => {
    const boardDoc = makeBoardDoc({ ownerId: OWNER_ID, memberIds: [OWNER_ID] });
    (Board.findById as jest.Mock).mockResolvedValue(boardDoc);
    (Card.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 2 });
    (List.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 1 });
    (ActivityLog.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 1 });
    (Board.findByIdAndDelete as jest.Mock).mockResolvedValue(boardDoc);

    const res = await request(app)
      .delete(`/api/boards/${BOARD_ID}`)
      .set('Authorization', authHeader(OWNER_ID));

    expect(res.status).toBe(200);
    expect(Card.deleteMany).toHaveBeenCalledWith({ boardId: BOARD_ID });
    expect(List.deleteMany).toHaveBeenCalledWith({ boardId: BOARD_ID });
    expect(ActivityLog.deleteMany).toHaveBeenCalledWith({ boardId: BOARD_ID });
    expect(Board.findByIdAndDelete).toHaveBeenCalledWith(BOARD_ID);
  });
});
