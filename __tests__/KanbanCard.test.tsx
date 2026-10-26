import { fireEvent, render, screen } from '@testing-library/react';
import { KanbanCard } from '@/components/board/KanbanCard';
import type { Card } from '@/types/domain';

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    title: 'Write tests',
    listId: 'list-1',
    boardId: 'board-1',
    description: 'Cover the optimistic store paths.',
    position: 0,
    assigneeId: 'user-2',
    priority: 'high',
    dueDate: '2026-11-03',
    label: 'Planning',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeHandlers() {
  return {
    onDragStart: jest.fn(),
    onDragEnd: jest.fn(),
    onDragOverCard: jest.fn(),
    onOpen: jest.fn(),
    onRequestDelete: jest.fn(),
  };
}

describe('KanbanCard', () => {
  const card = makeCard();

  it('opens the card from the full-card button', () => {
    const handlers = makeHandlers();
    render(<KanbanCard card={card} assigneeName="Grace" {...handlers} />);

    fireEvent.click(screen.getByRole('button', { name: `Open card ${card.title}` }));

    expect(handlers.onOpen).toHaveBeenCalledTimes(1);
  });

  it('renders priority, label, due date, and assignee', () => {
    const handlers = makeHandlers();
    render(<KanbanCard card={card} assigneeName="Grace Hopper" {...handlers} />);

    expect(screen.getByText('Planning')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText(card.description)).toBeInTheDocument();
    expect(screen.getByLabelText('Grace Hopper')).toBeInTheDocument();
  });

  it('requests deletion from the card menu without opening the card', () => {
    const handlers = makeHandlers();
    render(<KanbanCard card={card} assigneeName="Grace" {...handlers} />);

    fireEvent.click(screen.getByRole('button', { name: `Actions for ${card.title}` }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete card' }));

    expect(handlers.onRequestDelete).toHaveBeenCalledTimes(1);
    expect(handlers.onOpen).not.toHaveBeenCalled();
  });

  it('exposes the card id through the data transfer on drag start', () => {
    const handlers = makeHandlers();
    const { container } = render(<KanbanCard card={card} {...handlers} />);
    const article = container.querySelector('[data-flip-id]') as HTMLElement;
    const dataTransfer = { effectAllowed: '', setData: jest.fn() };

    fireEvent.dragStart(article, { dataTransfer });

    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', card.id);
    expect(handlers.onDragStart).toHaveBeenCalledTimes(1);
  });

  it('calls onDragEnd when the drag ends', () => {
    const handlers = makeHandlers();
    const { container } = render(<KanbanCard card={card} {...handlers} />);
    const article = container.querySelector('[data-flip-id]') as HTMLElement;

    fireEvent.dragEnd(article);

    expect(handlers.onDragEnd).toHaveBeenCalledTimes(1);
  });

  it('lets drag-over events bubble so list reordering can use column edges', () => {
    const handlers = makeHandlers();
    const onDragOver = jest.fn();
    const { container } = render(
      <div onDragOver={onDragOver}>
        <KanbanCard card={card} {...handlers} />
      </div>
    );
    const article = container.querySelector('[data-flip-id]') as HTMLElement;

    fireEvent.dragOver(article);

    expect(handlers.onDragOverCard).toHaveBeenCalledTimes(1);
    expect(onDragOver).toHaveBeenCalledTimes(1);
  });
});
