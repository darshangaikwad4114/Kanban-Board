'use client';

import { useRef } from 'react';
import type { Card } from '@kanban/shared';
import { animateExit } from '@/hooks/animations/useExitAnimation';
import { priorityStyles, getLabelStyle, formatDueDate } from '@/lib/theme';

interface KanbanCardProps {
  card: Card;
  onDelete: (cardId: string) => void;
  onDragStart: (cardId: string) => void;
  onDragOverCard?: (cardId: string, e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onClick: (card: Card) => void;
}

export function KanbanCard({ card, onDelete, onDragStart, onDragOverCard, onDragEnd, onClick }: KanbanCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dueInfo = formatDueDate(card.dueDate);
  const priority = (card.priority || 'none') as keyof typeof priorityStyles;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    animateExit(cardRef.current, () => onDelete(card._id));
  };

  return (
    <div
      ref={cardRef}
      data-flip-id={card._id}
      draggable
      onDragStart={() => onDragStart(card._id)}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOverCard?.(card._id, e);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onClick(card)}
      className="card p-3.5 cursor-grab active:cursor-grabbing hover:shadow-soft hover:border-accent/20 transition-all group"
    >
      <div className="flex flex-wrap gap-1.5 mb-2">
        {card.label && <span className={`badge ${getLabelStyle(card.label)}`}>{card.label}</span>}
        {priority !== 'none' && (
          <span className={`badge ${priorityStyles[priority].class}`}>{priorityStyles[priority].label}</span>
        )}
      </div>

      <p className="text-sm text-ink font-medium leading-snug">{card.title}</p>

      {card.description && (
        <p className="text-xs text-ink-muted mt-1.5 line-clamp-2">{card.description}</p>
      )}

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-column/40">
        {dueInfo ? (
          <span className={`text-xs font-medium ${dueInfo.class}`}>📅 {dueInfo.text}</span>
        ) : (
          <span />
        )}
        <button
          onClick={handleDelete}
          className="text-xs text-ink-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
