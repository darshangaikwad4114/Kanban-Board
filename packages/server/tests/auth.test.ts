import request from 'supertest';

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

type FakeUser = Record<string, unknown> & {
  _id: string;
  save: jest.Mock;
  comparePassword?: jest.Mock;
};

const USER_ID = '507f1f77bcf86cd799439011';

function makeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  const now = new Date('2024-01-01T00:00:00.000Z');
  return {
    _id: USER_ID,
    email: 'test@example.com',
    name: 'Test User',
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

describe('POST /api/auth/register', () => {
  it('registers a new user and returns tokens + user without leaking the password', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);
    const created = makeUser();
    (User.create as jest.Mock).mockResolvedValue(created);

    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'supersecret1',
      name: 'Test User',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.accessToken).toBe('string');
    expect(typeof res.body.data.refreshToken).toBe('string');
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user).not.toHaveProperty('password');
  });

  it('returns 409 EMAIL_EXISTS when the email is already registered', async () => {
    (User.findOne as jest.Mock).mockResolvedValue(makeUser());

    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'supersecret1',
      name: 'Test User',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
    expect(User.create).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR when the email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      password: 'supersecret1',
      name: 'Test User',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('returns 400 VALIDATION_ERROR when the password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'short',
      name: 'Test User',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(User.findOne).not.toHaveBeenCalled();
  });
});

describe('POST /api/auth/login', () => {
  it('returns 401 INVALID_CREDENTIALS for a wrong password', async () => {
    const comparePassword = jest.fn().mockResolvedValue(false);
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(makeUser({ comparePassword })),
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(comparePassword).toHaveBeenCalledWith('wrongpassword');
  });

  it('returns 401 INVALID_CREDENTIALS for an unknown email', async () => {
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.com',
      password: 'somepassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 400 VALIDATION_ERROR when the email is missing', async () => {
    const res = await request(app).post('/api/auth/login').send({
      password: 'somepassword',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('logs in successfully with correct credentials', async () => {
    const comparePassword = jest.fn().mockResolvedValue(true);
    const user = makeUser({ comparePassword });
    (User.findOne as jest.Mock).mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'correctpassword',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(user.save).toHaveBeenCalled();
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 UNAUTHORIZED when no Bearer token is provided', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(User.findById).not.toHaveBeenCalled();
  });
});
