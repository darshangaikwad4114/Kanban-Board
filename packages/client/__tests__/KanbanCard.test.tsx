import { render, screen, fireEvent } from '@testing-library/react';
import { KanbanCard } from '@/components/board/KanbanCard';
import type { Card } from '@kanban/shared';

jest.mock('@/hooks/animations/useExitAnimation', () => ({
  animateExit: jest.fn((_element: HTMLElement | null, onComplete: () => void) => onComplete()),
}));

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    _id: 'card-1',
    title: 'Write tests',
    listId: 'list-1',
    boardId: 'board-1',
    description: '',
    position: 0,
    assigneeId: null,
    priority: 'none',
    dueDate: null,
    label: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Mirrors the before/after computation done by the real consumer (BoardPage). */
function computeDragOverPosition(e: React.DragEvent): 'before' | 'after' {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
}

describe('KanbanCard', () => {
  const card = makeCard();
  let onDelete: jest.Mock;
  let onDragStart: jest.Mock;
  let onDragOverCard: jest.Mock;
  let onDragEnd: jest.Mock;
  let onClick: jest.Mock;

  beforeEach(() => {
    onDelete = jest.fn();
    onDragStart = jest.fn();
    onDragOverCard = jest.fn();
    onDragEnd = jest.fn();
    onClick = jest.fn();

    render(
      <KanbanCard
        card={card}
        onDelete={onDelete}
        onDragStart={onDragStart}
        onDragOverCard={onDragOverCard}
        onDragEnd={onDragEnd}
        onClick={onClick}
      />
    );
  });

  it('calls onClick with the card when clicked', () => {
    fireEvent.click(screen.getByText(card.title));

    expect(onClick).toHaveBeenCalledWith(card);
  });

  it('calls onDelete with the card id and does not trigger onClick', () => {
    fireEvent.click(screen.getByText('Delete'));

    expect(onDelete).toHaveBeenCalledWith(card._id);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('calls onDragStart with the card id when dragging starts', () => {
    const cardElement = screen.getByText(card.title).closest('[data-flip-id]') as HTMLElement;

    fireEvent.dragStart(cardElement);

    expect(onDragStart).toHaveBeenCalledWith(card._id);
  });

  it('calls onDragEnd when dragging ends', () => {
    const cardElement = screen.getByText(card.title).closest('[data-flip-id]') as HTMLElement;

    fireEvent.dragEnd(cardElement);

    expect(onDragEnd).toHaveBeenCalled();
  });

  describe('dragging over the card', () => {
    beforeEach(() => {
      jest.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
        top: 100,
        bottom: 150,
        height: 50,
        left: 0,
        right: 200,
        width: 200,
        x: 0,
        y: 100,
        toJSON: () => {},
      } as DOMRect);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('resolves to "before" when hovering the top half of the card', () => {
      const cardElement = screen.getByText(card.title).closest('[data-flip-id]') as HTMLElement;

      fireEvent.dragOver(cardElement, { clientY: 110 });

      expect(onDragOverCard).toHaveBeenCalledWith(card._id, expect.anything());
      const event = onDragOverCard.mock.calls[0][1] as React.DragEvent;
      expect(computeDragOverPosition(event)).toBe('before');
    });

    it('resolves to "after" when hovering the bottom half of the card', () => {
      const cardElement = screen.getByText(card.title).closest('[data-flip-id]') as HTMLElement;

      fireEvent.dragOver(cardElement, { clientY: 140 });

      expect(onDragOverCard).toHaveBeenCalledWith(card._id, expect.anything());
      const event = onDragOverCard.mock.calls[0][1] as React.DragEvent;
      expect(computeDragOverPosition(event)).toBe('after');
    });
  });
});
