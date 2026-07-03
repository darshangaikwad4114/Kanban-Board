import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { TokenPayload } from '@kanban/shared';

export interface AuthRequest<Params = any, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: TokenPayload;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Access token is required',
          code: 'UNAUTHORIZED',
          status: 401,
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Access token has expired',
          code: 'TOKEN_EXPIRED',
          status: 401,
        },
      });
      return;
    }
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid access token',
        code: 'INVALID_TOKEN',
        status: 401,
      },
    });
  }
};