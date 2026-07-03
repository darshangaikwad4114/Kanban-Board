import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models';
import { AppError } from '../middleware/errorHandler';
import { TokenPayload, RegisterInput, LoginInput } from '@kanban/shared';

const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    { userId: payload.userId, email: payload.email },
    env.JWT_SECRET,
    { expiresIn: 900 } // 15 minutes
  );
  const refreshToken = jwt.sign(
    { userId: payload.userId, email: payload.email },
    env.JWT_REFRESH_SECRET,
    { expiresIn: 604800 } // 7 days
  );
  return { accessToken, refreshToken };
};

export const register = async (
  req: Request<{}, {}, RegisterInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
    }

    const user = await User.create({ email, password, name });
    const payload: TokenPayload = { userId: user._id.toString(), email: user.email };
    const tokens = generateTokens(payload);

    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      data: {
        ...tokens,
        user: {
          _id: user._id.toString(),
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const payload: TokenPayload = { userId: user._id.toString(), email: user.email };
    const tokens = generateTokens(payload);

    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: {
        ...tokens,
        user: {
          _id: user._id.toString(),
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
    }

    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const payload: TokenPayload = { userId: user._id.toString(), email: user.email };
    const tokens = generateTokens(payload);

    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      data: {
        ...tokens,
        user: {
          _id: user._id.toString(),
          email: user.email,
          name: user.name,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      },
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN'));
      return;
    }
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
      await User.findByIdAndUpdate(decoded.userId, { $unset: { refreshToken: 1 } });
    }
    res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById((req as any).user.userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }
    res.status(200).json({
      success: true,
      data: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};