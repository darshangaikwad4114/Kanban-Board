'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BOARD_TEMPLATES, BOARD_COLORS, type BoardColor } from '@kanban/shared';
import { Modal } from '@/components/ui/Modal';
import { api } from '@/lib/api';
import { getBoardColorStyle } from '@/lib/theme';

interface CreateBoardModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateBoardModal({ open, onClose, onCreated }: CreateBoardModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('basic-kanban');
  const [color, setColor] = useState<BoardColor>('lavender');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const selectedTemplate = BOARD_TEMPLATES.find((t) => t.id === templateId);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    setError('');
    const res = await api.post<{ _id: string }>('/boards', {
      title: title.trim(),
      templateId,
      color,
      description: description.trim() || undefined,
    });
    if (res.success && res.data) {
      onCreated();
      onClose();
      setTitle('');
      setDescription('');
      router.push(`/board/${res.data._id}`);
    } else {
      setError(res.error?.message || 'Failed to create board');
    }
    setIsCreating(false);
  };

  const handleClose = () => {
    onClose();
    setError('');
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create a new board"
      description="Pick a template to get started quickly, or use a blank canvas"
      size="xl"
    >
      <div className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1.5">Board name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product Roadmap Q3"
              className="input"
              autoFocus
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-ink mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this board for?"
              className="input"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">Board color</label>
          <div className="flex flex-wrap gap-2">
            {BOARD_COLORS.map((c) => {
              const style = getBoardColorStyle(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-9 h-9 rounded-xl ${style.bg} transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-accent scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                  aria-label={c}
                />
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">Choose a template</label>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {BOARD_TEMPLATES.map((template) => {
              const style = getBoardColorStyle(template.color);
              const isSelected = templateId === template.id;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    setTemplateId(template.id);
                    setColor(template.color as BoardColor);
                    if (!title) setTitle(template.name === 'Blank Board' ? '' : template.name);
                  }}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? `${style.border} ${style.soft} shadow-card`
                      : 'border-surface-column hover:border-accent/30 hover:bg-surface-muted'
                  }`}
                >
                  <span className="text-2xl mb-2 block">{template.icon}</span>
                  <p className="font-medium text-ink text-sm">{template.name}</p>
                  <p className="text-xs text-ink-muted mt-1 line-clamp-2">{template.description}</p>
                  {template.lists.length > 0 && (
                    <p className="text-xs text-ink-faint mt-2">
                      {template.lists.length} lists · {template.lists.reduce((n, l) => n + (l.cards?.length || 0), 0)} sample cards
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedTemplate && selectedTemplate.lists.length > 0 && (
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs font-medium text-ink-muted mb-2">Preview columns</p>
            <div className="flex flex-wrap gap-2">
              {selectedTemplate.lists.map((list) => (
                <span key={list.title} className="badge bg-surface-raised text-ink-muted border border-surface-column">
                  {list.title}
                </span>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger bg-danger-soft px-4 py-2 rounded-xl">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={handleClose} className="btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !title.trim()}
            className="btn-primary"
          >
            {isCreating ? 'Creating…' : 'Create board'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
