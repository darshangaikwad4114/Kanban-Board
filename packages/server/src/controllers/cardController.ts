import { Response, NextFunction } from 'express';
import { Card, Board, List, ActivityLog } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { CreateCardInput, UpdateCardInput } from '@kanban/shared';

export const createCard = async (
  req: AuthRequest<{}, {}, CreateCardInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, listId, boardId, description, position, assigneeId } = req.body;

    const board = await Board.findById(boardId);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

    const isMember = board.ownerId.toString() === req.user!.userId ||
      board.memberIds.some(m => m.toString() === req.user!.userId);
    if (!isMember) throw new AppError('Access denied', 403, 'ACCESS_DENIED');

    const list = await List.findById(listId);
    if (!list) throw new AppError('List not found', 404, 'LIST_NOT_FOUND');

    const maxPosition = position !== undefined ? position : await Card.countDocuments({ listId });
    const card = await Card.create({
      title,
      listId,
      boardId,
      description: description || '',
      position: maxPosition,
      assigneeId: assigneeId || null,
    });

    await ActivityLog.create({
      boardId,
      userId: req.user!.userId,
      userName: req.user!.email,
      action: 'created card',
      entityType: 'card',
      entityId: card._id.toString(),
      details: `Created card "${title}"`,
    });

    res.status(201).json({ success: true, data: card.toJSON() });
  } catch (error) {
    next(error);
  }
};

export const updateCard = async (
  req: AuthRequest<{ id: string }, {}, UpdateCardInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');

    const board = await Board.findById(card.boardId);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

    const isMember = board.ownerId.toString() === req.user!.userId ||
      board.memberIds.some(m => m.toString() === req.user!.userId);
    if (!isMember) throw new AppError('Access denied', 403, 'ACCESS_DENIED');

    const changes: string[] = [];
    if (req.body.title !== undefined) { card.title = req.body.title; changes.push('title'); }
    if (req.body.description !== undefined) { card.description = req.body.description; changes.push('description'); }
    if (req.body.position !== undefined) { card.position = req.body.position; changes.push('position'); }
    if (req.body.listId !== undefined) { card.listId = req.body.listId as any; changes.push('list'); }
    if (req.body.assigneeId !== undefined) { card.assigneeId = req.body.assigneeId as any; changes.push('assignee'); }

    card.markModified('updatedAt');
    await card.save();

    await ActivityLog.create({
      boardId: card.boardId,
      userId: req.user!.userId,
      userName: req.user!.email,
      action: 'updated card',
      entityType: 'card',
      entityId: card._id.toString(),
      details: `Updated card "${card.title}" - changed: ${changes.join(', ')}`,
    });

    res.status(200).json({ success: true, data: card.toJSON() });
  } catch (error) {
    next(error);
  }
};

export const deleteCard = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const card = await Card.findById(req.params.id);
    if (!card) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');

    const board = await Board.findById(card.boardId);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

    const isMember = board.ownerId.toString() === req.user!.userId ||
      board.memberIds.some(m => m.toString() === req.user!.userId);
    if (!isMember) throw new AppError('Access denied', 403, 'ACCESS_DENIED');

    const cardTitle = card.title;
    await Card.findByIdAndDelete(card._id);

    await ActivityLog.create({
      boardId: card.boardId,
      userId: req.user!.userId,
      userName: req.user!.email,
      action: 'deleted card',
      entityType: 'card',
      entityId: req.params.id,
      details: `Deleted card "${cardTitle}"`,
    });

    res.status(200).json({ success: true, data: { message: 'Card deleted' } });
  } catch (error) {
    next(error);
  }
};

export const moveCard = async (
  req: AuthRequest<{ id: string }, {}, { targetListId: string; newPosition: number }>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { targetListId, newPosition } = req.body;
    const card = await Card.findById(req.params.id);
    if (!card) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');

    const board = await Board.findById(card.boardId);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

    const isMember = board.ownerId.toString() === req.user!.userId ||
      board.memberIds.some(m => m.toString() === req.user!.userId);
    if (!isMember) throw new AppError('Access denied', 403, 'ACCESS_DENIED');

    card.listId = targetListId as any;
    card.position = newPosition;
    await card.save();

    res.status(200).json({ success: true, data: card.toJSON() });
  } catch (error) {
    next(error);
  }
};