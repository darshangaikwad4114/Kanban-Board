import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../src/models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
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

const USER_ID = '507f1f77bcf86cd799439011';

const authHeader = (): string => {
  const token = jwt.sign({ userId: USER_ID, email: 'test@example.com' }, env.JWT_SECRET, { expiresIn: '15m' });
  return `Bearer ${token}`;
};

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Rate Limiting', () => {
  it('returns 429 when auth rate limit is exceeded', async () => {
    // Auth limiter allows 20 requests per 15 minutes
    // Send 21 requests rapidly
    for (let i = 0; i < 20; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });
    }

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT');
  });

  it('returns 429 when board rate limit is exceeded', async () => {
    // Board limiter allows 30 requests per minute
    for (let i = 0; i < 30; i++) {
      await request(app)
        .get('/api/boards')
        .set('Authorization', authHeader());
    }

    const res = await request(app)
      .get('/api/boards')
      .set('Authorization', authHeader());

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMIT');
  });
});