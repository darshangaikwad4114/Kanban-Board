import { Request, Response, NextFunction } from 'express';
import { Board, List, Card, ActivityLog } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { CreateBoardInput, UpdateBoardInput } from '@kanban/shared';

export const createBoard = async (
  req: AuthRequest<{}, {}, CreateBoardInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title } = req.body;
    const board = await Board.create({ title, ownerId: req.user!.userId, memberIds: [req.user!.userId] });
    res.status(201).json({ success: true, data: board.toJSON() });
  } catch (error) {
    next(error);
  }
};

export const getBoards = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const boards = await Board.find({
      $or: [{ ownerId: req.user!.userId }, { memberIds: req.user!.userId }],
    }).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: boards.map(b => b.toJSON()) });
  } catch (error) {
    next(error);
  }
};

export const getBoard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

    const isMember = board.ownerId.toString() === req.user!.userId ||
      board.memberIds.some(m => m.toString() === req.user!.userId);
    if (!isMember) throw new AppError('Access denied', 403, 'ACCESS_DENIED');

    const lists = await List.find({ boardId: board._id }).sort({ position: 1 });
    const cards = await Card.find({ boardId: board._id }).sort({ position: 1 });
    const activityLogs = await ActivityLog.find({ boardId: board._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        board: board.toJSON(),
        lists: lists.map(l => l.toJSON()),
        cards: cards.map(c => c.toJSON()),
        activityLogs: activityLogs.map(a => a.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateBoard = async (
  req: AuthRequest<{ id: string }, {}, UpdateBoardInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    if (board.ownerId.toString() !== req.user!.userId) {
      throw new AppError('Only the owner can update the board', 403, 'ACCESS_DENIED');
    }

    if (req.body.title) board.title = req.body.title;
    if (req.body.memberIds) board.memberIds = req.body.memberIds.map(m => m as any);
    await board.save();

    res.status(200).json({ success: true, data: board.toJSON() });
  } catch (error) {
    next(error);
  }
};

export const deleteBoard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
    if (board.ownerId.toString() !== req.user!.userId) {
      throw new AppError('Only the owner can delete the board', 403, 'ACCESS_DENIED');
    }

    await Card.deleteMany({ boardId: board._id });
    await List.deleteMany({ boardId: board._id });
    await ActivityLog.deleteMany({ boardId: board._id });
    await Board.findByIdAndDelete(board._id);

    res.status(200).json({ success: true, data: { message: 'Board deleted' } });
  } catch (error) {
    next(error);
  }
};