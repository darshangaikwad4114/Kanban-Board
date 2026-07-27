import request from 'supertest';
import jwt from 'jsonwebtoken';

jest.mock('../src/models', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

import { app } from '../src/app';
import { User } from '../src/models';
import { env } from '../src/config/env';

const USER_ID = '507f1f77bcf86cd799439011';

function makeUser(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-01-01T00:00:00.000Z');
  return {
    _id: USER_ID,
    email: 'test@example.com',
    name: 'Test User',
    refreshToken: 'valid-refresh-token',
    createdAt: now,
    updatedAt: now,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/auth/refresh', () => {
  it('returns 400 when refresh token is missing', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when refresh token is invalid JWT', async () => {
    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'not-a-valid-jwt',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('returns 401 when refresh token is expired', async () => {
    const expiredToken = jwt.sign(
      { userId: USER_ID, email: 'test@example.com' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '0s' }
    );

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: expiredToken,
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('returns 401 when user does not exist', async () => {
    const validToken = jwt.sign(
      { userId: USER_ID, email: 'test@example.com' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '15m' }
    );
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: validToken,
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('returns 401 when stored refresh token does not match', async () => {
    const validToken = jwt.sign(
      { userId: USER_ID, email: 'test@example.com' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '15m' }
    );
    const user = makeUser({ refreshToken: 'different-token' });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: validToken,
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('rotates tokens on successful refresh', async () => {
    const validToken = jwt.sign(
      { userId: USER_ID, email: 'test@example.com' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '15m' }
    );
    const user = makeUser({ refreshToken: validToken });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: validToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
    expect(res.body.data.refreshToken).not.toBe(validToken);
    expect(user.save).toHaveBeenCalled();
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the refresh token from the database', async () => {
    const validToken = jwt.sign(
      { userId: USER_ID, email: 'test@example.com' },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '15m' }
    );
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

    const res = await request(app).post('/api/auth/logout').send({
      refreshToken: validToken,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(USER_ID, { $unset: { refreshToken: 1 } });
  });

  it('succeeds even without a refresh token', async () => {
    const res = await request(app).post('/api/auth/logout').send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});