'use client';

import { useRef } from 'react';
import type { Card } from '@kanban/shared';
import { animateExit } from '@/hooks/animations/useExitAnimation';

interface KanbanCardProps {
  card: Card;
  onDelete: (cardId: string) => void;
  onDragStart: (cardId: string) => void;
}

export function KanbanCard({ card, onDelete, onDragStart }: KanbanCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

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
      className="card p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <p className="text-sm text-gray-900 font-medium">{card.title}</p>
      {card.description && (
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        {card.assigneeId && (
          <span className="badge bg-primary-100 text-primary-700">Assigned</span>
        )}
        <button
          onClick={handleDelete}
          className="text-gray-400 hover:text-red-500 text-xs ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
