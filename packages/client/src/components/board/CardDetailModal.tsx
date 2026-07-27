'use client';

import { useState, useEffect } from 'react';
import type { Card, List, CardPriority } from '@kanban/shared';
import { CARD_LABELS } from '@kanban/shared';
import { Modal } from '@/components/ui/Modal';
import { priorityStyles, getLabelStyle } from '@/lib/theme';

interface CardDetailModalProps {
  card: Card | null;
  lists: List[];
  open: boolean;
  onClose: () => void;
  onSave: (cardId: string, data: Partial<Card>) => Promise<void>;
  onDelete: (cardId: string) => void;
}

export function CardDetailModal({ card, lists, open, onClose, onSave, onDelete }: CardDetailModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listId, setListId] = useState('');
  const [priority, setPriority] = useState<CardPriority>('none');
  const [label, setLabel] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setDescription(card.description || '');
      setListId(card.listId);
      setPriority((card.priority as CardPriority) || 'none');
      setLabel(card.label || null);
      setDueDate(card.dueDate ? card.dueDate.split('T')[0] : '');
    }
  }, [card]);

  if (!card) return null;

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(card._id, {
      title: title.trim(),
      description,
      listId,
      priority,
      label,
      dueDate: dueDate || null,
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Card details" size="lg">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Title</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Add more details…"
            className="input resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">List</label>
            <select value={listId} onChange={(e) => setListId(e.target.value)} className="input">
              {lists.map((l) => (
                <option key={l._id} value={l._id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">Priority</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(priorityStyles) as CardPriority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`badge cursor-pointer transition-all ${
                  priorityStyles[p].class
                } ${priority === p ? 'ring-2 ring-accent/40 scale-105' : 'opacity-60 hover:opacity-100'}`}
              >
                {priorityStyles[p].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-ink mb-2">Label</label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setLabel(null)}
              className={`badge cursor-pointer bg-surface-muted text-ink-muted ${
                !label ? 'ring-2 ring-accent/40' : 'opacity-60'
              }`}
            >
              None
            </button>
            {CARD_LABELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLabel(l)}
                className={`badge cursor-pointer ${getLabelStyle(l)} ${
                  label === l ? 'ring-2 ring-accent/40 scale-105' : 'opacity-60 hover:opacity-100'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-surface-column/60">
          <button
            type="button"
            onClick={() => {
              onDelete(card._id);
              onClose();
            }}
            className="btn-danger text-sm"
          >
            Delete card
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={isSaving || !title.trim()} className="btn-primary">
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
