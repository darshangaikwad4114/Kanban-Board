import { Response, NextFunction } from 'express';
import { List, Board, Card, ActivityLog } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getIO, broadcastActivity } from '../socket';
import {
  CreateListInput,
  UpdateListInput,
  ServerEvent,
  ListChangedPayload,
  ListDeletedPayload,
  CardDeletedPayload,
} from '@kanban/shared';

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

    const io = getIO();
    if (io) {
      const listChangedPayload: ListChangedPayload = {
        listId: list._id.toString(),
        boardId,
        changes: { title: list.title, position: list.position },
      };
      io.to(`board:${boardId}`).emit(ServerEvent.LIST_CHANGED, listChangedPayload);
      broadcastActivity(io, boardId, {
        userId: req.user!.userId,
        userName: req.user!.email,
        action: 'created list',
        entityType: 'list',
        entityId: list._id.toString(),
        details: `Created list "${title}"`,
      });
    }

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

    const changes: ListChangedPayload['changes'] = {};
    if (req.body.title !== undefined) { list.title = req.body.title; changes.title = list.title; }
    if (req.body.position !== undefined) { list.position = req.body.position; changes.position = list.position; }
    await list.save();

    const io = getIO();
    if (io) {
      const listChangedPayload: ListChangedPayload = {
        listId: list._id.toString(),
        boardId: list.boardId.toString(),
        changes,
      };
      io.to(`board:${list.boardId}`).emit(ServerEvent.LIST_CHANGED, listChangedPayload);
    }

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

    const listTitle = list.title;
    const boardId = list.boardId.toString();
    const listId = list._id.toString();
    const cardIds = (await Card.find({ listId: list._id }, { _id: 1 })).map((c) => c._id.toString());

    await Card.deleteMany({ listId: list._id });
    await List.findByIdAndDelete(list._id);

    await ActivityLog.create({
      boardId,
      userId: req.user!.userId,
      userName: req.user!.email,
      action: 'deleted list',
      entityType: 'list',
      entityId: listId,
      details: `Deleted list "${listTitle}"`,
    });

    const io = getIO();
    if (io) {
      const room = `board:${boardId}`;
      const listDeletedPayload: ListDeletedPayload = { listId, boardId };
      io.to(room).emit(ServerEvent.LIST_DELETED, listDeletedPayload);
      for (const cardId of cardIds) {
        const cardDeletedPayload: CardDeletedPayload = { cardId, boardId, listId };
        io.to(room).emit(ServerEvent.CARD_DELETED, cardDeletedPayload);
      }
      broadcastActivity(io, boardId, {
        userId: req.user!.userId,
        userName: req.user!.email,
        action: 'deleted list',
        entityType: 'list',
        entityId: listId,
        details: `Deleted list "${listTitle}"`,
      });
    }

    res.status(200).json({ success: true, data: { message: 'List deleted' } });
  } catch (error) {
    next(error);
  }
};
