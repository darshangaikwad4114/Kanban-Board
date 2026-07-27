import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { validate } from '../src/middleware/validate';

describe('validate middleware', () => {
  const schema = z.object({ name: z.string().min(1, 'Name is required') });

  it('calls next() with no error and assigns the parsed data on success', () => {
    const req = { body: { name: 'Ada' } } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({ name: 'Ada' });
  });

  it('calls next(error) with a ZodError when parsing fails', () => {
    const req = { body: { name: '' } } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    const errorArg = (next as jest.Mock).mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(ZodError);
  });

  it('reads from the given source instead of the body when specified', () => {
    const req = { query: { name: 'Grace' } } as unknown as Request;
    const res = {} as Response;
    const next = jest.fn() as NextFunction;

    validate(schema, 'query')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ name: 'Grace' });
  });
});
