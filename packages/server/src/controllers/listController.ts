import { Response, NextFunction } from 'express';
import { List, Board, Card, ActivityLog } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { CreateListInput, UpdateListInput } from '@kanban/shared';

export const createList = async (
  req: AuthRequest<{}, {}, CreateListInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, boardId, position } = req.body;

    const board = await Board.findById(boardId);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

    const isMember = board.ownerId.toString() === req.user!.userId ||
      board.memberIds.some(m => m.toString() === req.user!.userId);
    if (!isMember) throw new AppError('Access denied', 403, 'ACCESS_DENIED');

    const maxPosition = position !== undefined ? position : await List.countDocuments({ boardId });
    const list = await List.create({ title, boardId, position: maxPosition });

    await ActivityLog.create({
      boardId,
      userId: req.user!.userId,
      userName: req.user!.email,
      action: 'created list',
      entityType: 'list',
      entityId: list._id.toString(),
      details: `Created list "${title}"`,
    });

    res.status(201).json({ success: true, data: list.toJSON() });
  } catch (error) {
    next(error);
  }
};

export const updateList = async (
  req: AuthRequest<{ id: string }, {}, UpdateListInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) throw new AppError('List not found', 404, 'LIST_NOT_FOUND');

    const board = await Board.findById(list.boardId);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

    const isMember = board.ownerId.toString() === req.user!.userId ||
      board.memberIds.some(m => m.toString() === req.user!.userId);
    if (!isMember) throw new AppError('Access denied', 403, 'ACCESS_DENIED');

    if (req.body.title !== undefined) list.title = req.body.title;
    if (req.body.position !== undefined) list.position = req.body.position;
    await list.save();

    res.status(200).json({ success: true, data: list.toJSON() });
  } catch (error) {
    next(error);
  }
};

export const deleteList = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const list = await List.findById(req.params.id);
    if (!list) throw new AppError('List not found', 404, 'LIST_NOT_FOUND');

    const board = await Board.findById(list.boardId);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

    const isMember = board.ownerId.toString() === req.user!.userId ||
      board.memberIds.some(m => m.toString() === req.user!.userId);
    if (!isMember) throw new AppError('Access denied', 403, 'ACCESS_DENIED');

    await Card.deleteMany({ listId: list._id });
    await List.findByIdAndDelete(list._id);

    res.status(200).json({ success: true, data: { message: 'List deleted' } });
  } catch (error) {
    next(error);
  }
};