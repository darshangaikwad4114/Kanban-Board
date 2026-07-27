import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Board, List, Card, ActivityLog } from '../models';
import { AppError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { getIO } from '../socket';
import {
  CreateBoardInput,
  UpdateBoardInput,
  getTemplateById,
  BOARD_TEMPLATES,
  ServerEvent,
  BoardUpdatedPayload,
} from '@kanban/shared';

export const getTemplates = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: BOARD_TEMPLATES });
  } catch (error) {
    next(error);
  }
};

export const createBoard = async (
  req: AuthRequest<{}, {}, CreateBoardInput>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { title, templateId, color, description } = req.body;
    const template = templateId ? getTemplateById(templateId) : undefined;

    const board = await Board.create({
      title,
      ownerId: req.user!.userId,
      memberIds: [req.user!.userId],
      color: color || template?.color || 'lavender',
      description: description || template?.description || '',
      templateId: templateId || undefined,
    });

    const createdLists = [];
    const createdCards = [];

    if (template && template.lists.length > 0) {
      for (let i = 0; i < template.lists.length; i++) {
        const listDef = template.lists[i];
        const list = await List.create({
          title: listDef.title,
          boardId: board._id,
          position: i,
        });
        createdLists.push(list);

        if (listDef.cards) {
          for (let j = 0; j < listDef.cards.length; j++) {
            const cardDef = listDef.cards[j];
            const card = await Card.create({
              title: cardDef.title,
              description: cardDef.description || '',
              listId: list._id,
              boardId: board._id,
              position: j,
              priority: cardDef.priority || 'none',
              label: cardDef.label || null,
            });
            createdCards.push(card);
          }
        }
      }

      await ActivityLog.create({
        boardId: board._id,
        userId: req.user!.userId,
        userName: req.user!.email,
        action: 'created board from template',
        entityType: 'board',
        entityId: board._id.toString(),
        details: `Created "${title}" using ${template.name} template`,
      });
    }

    res.status(201).json({
      success: true,
      data: {
        ...board.toJSON(),
        lists: createdLists.map((l) => l.toJSON()),
        cards: createdCards.map((c) => c.toJSON()),
      },
    });
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const skip = (page - 1) * limit;

    const filter = {
      $or: [{ ownerId: req.user!.userId }, { memberIds: req.user!.userId }],
    };

    const [boards, total] = await Promise.all([
      Board.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Board.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: boards.map(b => b.toJSON()),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
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

    const changes: BoardUpdatedPayload['changes'] = {};
    if (req.body.title) { board.title = req.body.title; changes.title = board.title; }
    if (req.body.description !== undefined) board.description = req.body.description;
    if (req.body.color) board.color = req.body.color;
    if (req.body.memberIds) {
      board.memberIds = req.body.memberIds.map((m) => new mongoose.Types.ObjectId(m));
      changes.memberIds = req.body.memberIds;
    }
    await board.save();

    const io = getIO();
    if (io && Object.keys(changes).length > 0) {
      const payload: BoardUpdatedPayload = { boardId: board._id.toString(), changes };
      io.to(`board:${board._id}`).emit(ServerEvent.BOARD_UPDATED, payload);
    }

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
