import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Card, Board, List, ActivityLog } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getIO, broadcastCardChange, broadcastActivity } from '../socket';
import { planCardMove } from '../utils/reorder';
import { ServerEvent, CardChangedPayload, CardDeletedPayload } from '@kanban/shared';
import { CreateCardInput, UpdateCardInput, MoveCardInput } from '@kanban/shared';

export const createCard = async (
  req: AuthRequest<{}, {}, CreateCardInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, listId, boardId, description, position, assigneeId, priority, dueDate, label } = req.body;

    const board = await Board.findById(boardId);
    if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

    const isMember = board.ownerId.toString() === req.user!.userId ||
      board.memberIds.some(m => m.toString() === req.user!.userId);
    if (!isMember) throw new AppError('Access denied', 403, 'ACCESS_DENIED');

    const list = await List.findById(listId);
    if (!list) throw new AppError('List not found', 404, 'LIST_NOT_FOUND');
    if (list.boardId.toString() !== boardId) {
      throw new AppError('List does not belong to this board', 400, 'INVALID_LIST');
    }

    const maxPosition = position !== undefined ? position : await Card.countDocuments({ listId });
    const card = await Card.create({
      title,
      listId,
      boardId,
      description: description || '',
      position: maxPosition,
      assigneeId: assigneeId || null,
      priority: priority || 'none',
      dueDate: dueDate ? new Date(dueDate) : null,
      label: label || null,
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

    const io = getIO();
    if (io) {
      broadcastActivity(io, boardId, {
        userId: req.user!.userId,
        userName: req.user!.email,
        action: 'created card',
        entityType: 'card',
        entityId: card._id.toString(),
        details: `Created card "${title}"`,
      });
    }

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

    const changes: CardChangedPayload['changes'] = {};
    const changeList: string[] = [];
    if (req.body.title !== undefined) { card.title = req.body.title; changes.title = card.title; changeList.push('title'); }
    if (req.body.description !== undefined) { card.description = req.body.description; changes.description = card.description; changeList.push('description'); }
    if (req.body.position !== undefined) { card.position = req.body.position; changes.position = card.position; changeList.push('position'); }
    if (req.body.listId !== undefined) {
      card.listId = new mongoose.Types.ObjectId(req.body.listId);
      changes.listId = req.body.listId;
      changeList.push('list');
    }
    if (req.body.assigneeId !== undefined) {
      card.assigneeId = req.body.assigneeId ? new mongoose.Types.ObjectId(req.body.assigneeId) : null;
      changes.assigneeId = req.body.assigneeId;
      changeList.push('assignee');
    }
    if (req.body.priority !== undefined) { card.priority = req.body.priority; changes.priority = card.priority; changeList.push('priority'); }
    if (req.body.dueDate !== undefined) {
      card.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
      changes.dueDate = req.body.dueDate;
      changeList.push('dueDate');
    }
    if (req.body.label !== undefined) { card.label = req.body.label; changes.label = req.body.label; changeList.push('label'); }

    await card.save();

    await ActivityLog.create({
      boardId: card.boardId,
      userId: req.user!.userId,
      userName: req.user!.email,
      action: 'updated card',
      entityType: 'card',
      entityId: card._id.toString(),
      details: `Updated card "${card.title}" - changed: ${changeList.join(', ')}`,
    });

    const io = getIO();
    if (io) {
      broadcastCardChange(io, card.boardId.toString(), {
        cardId: card._id.toString(),
        listId: card.listId.toString(),
        changes,
        updatedAt: card.updatedAt.toISOString(),
        updatedBy: req.user!.userId,
      });
      broadcastActivity(io, card.boardId.toString(), {
        userId: req.user!.userId,
        userName: req.user!.email,
        action: 'updated card',
        entityType: 'card',
        entityId: card._id.toString(),
        details: `Updated card "${card.title}" - changed: ${changeList.join(', ')}`,
      });
    }

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
    const cardId = card._id.toString();
    const listId = card.listId.toString();
    const boardId = card.boardId.toString();

    await Card.findByIdAndDelete(card._id);
    // Close the position gap left behind so remaining cards stay contiguous.
    await Card.updateMany(
      { listId, position: { $gt: card.position } },
      { $inc: { position: -1 } }
    );

    await ActivityLog.create({
      boardId,
      userId: req.user!.userId,
      userName: req.user!.email,
      action: 'deleted card',
      entityType: 'card',
      entityId: req.params.id,
      details: `Deleted card "${cardTitle}"`,
    });

    const io = getIO();
    if (io) {
      const cardDeletedPayload: CardDeletedPayload = { cardId, boardId, listId };
      io.to(`board:${boardId}`).emit(ServerEvent.CARD_DELETED, cardDeletedPayload);
      broadcastActivity(io, boardId, {
        userId: req.user!.userId,
        userName: req.user!.email,
        action: 'deleted card',
        entityType: 'card',
        entityId: cardId,
        details: `Deleted card "${cardTitle}"`,
      });
    }

    res.status(200).json({ success: true, data: { message: 'Card deleted' } });
  } catch (error) {
    next(error);
  }
};

export const moveCard = async (
  req: AuthRequest<{ id: string }, {}, MoveCardInput>,
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

    const targetList = await List.findById(targetListId);
    if (!targetList) throw new AppError('Target list not found', 404, 'LIST_NOT_FOUND');
    if (targetList.boardId.toString() !== card.boardId.toString()) {
      throw new AppError('Target list belongs to a different board', 400, 'INVALID_LIST');
    }

    const sourceListId = card.listId.toString();
    const oldPosition = card.position;

    const destCount = await Card.countDocuments({ listId: targetListId, _id: { $ne: card._id } });
    const { position, shifts } = planCardMove({
      sourceListId,
      targetListId,
      oldPosition,
      requestedPosition: newPosition,
      destCount,
    });

    for (const shift of shifts) {
      const positionFilter: Record<string, number> = { $gte: shift.from };
      if (shift.to !== null) positionFilter.$lte = shift.to;
      await Card.updateMany(
        { listId: shift.listId, _id: { $ne: card._id }, position: positionFilter },
        { $inc: { position: shift.delta } }
      );
    }

    card.listId = new mongoose.Types.ObjectId(targetListId);
    card.position = position;
    await card.save();

    if (sourceListId !== targetListId) {
      await ActivityLog.create({
        boardId: card.boardId,
        userId: req.user!.userId,
        userName: req.user!.email,
        action: 'moved card',
        entityType: 'card',
        entityId: card._id.toString(),
        details: `Moved card "${card.title}" to "${targetList.title}"`,
      });
    }

    const io = getIO();
    if (io) {
      broadcastCardChange(io, card.boardId.toString(), {
        cardId: card._id.toString(),
        listId: card.listId.toString(),
        changes: { listId: card.listId.toString(), position: card.position },
        updatedAt: card.updatedAt.toISOString(),
        updatedBy: req.user!.userId,
      });
      if (sourceListId !== targetListId) {
        broadcastActivity(io, card.boardId.toString(), {
          userId: req.user!.userId,
          userName: req.user!.email,
          action: 'moved card',
          entityType: 'card',
          entityId: card._id.toString(),
          details: `Moved card "${card.title}" to "${targetList.title}"`,
        });
      }
    }

    res.status(200).json({ success: true, data: card.toJSON() });
  } catch (error) {
    next(error);
  }
};
