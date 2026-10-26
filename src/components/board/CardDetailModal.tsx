'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Clock, Trash2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SelectField, TextField, TextareaField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { formatDueDate, formatRelativeTime } from '@/lib/dates';
import { getLabelStyle, priorityStyles } from '@/lib/theme';
import { cn } from '@/lib/utils';
import type { CardPatchInput } from '@/lib/validation';
import type { BoardList, BoardMember, Card, CardPriority } from '@/types/domain';

interface CardDetailModalProps {
  open: boolean;
  card: Card | null;
  lists: BoardList[];
  members: BoardMember[];
  onClose: () => void;
  onSave: (
    cardId: string,
    patch: CardPatchInput
  ) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (cardId: string) => Promise<boolean>;
}

const PRIORITY_OPTIONS: CardPriority[] = ['none', 'low', 'medium', 'high'];
const LABEL_OPTIONS = ['Bug', 'Feature', 'Design', 'Planning', 'Blog', 'Social', 'Urgent'];

export function CardDetailModal({
  open,
  card,
  lists,
  members,
  onClose,
  onSave,
  onDelete,
}: CardDetailModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listId, setListId] = useState('');
  const [priority, setPriority] = useState<CardPriority>('none');
  const [label, setLabel] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!card) return;
    setTitle(card.title);
    setDescription(card.description);
    setListId(card.listId);
    setPriority(card.priority);
    setLabel(card.label);
    setDueDate(card.dueDate ?? '');
    setAssigneeId(card.assigneeId ?? '');
    setError(null);
    setConfirmOpen(false);
    setIsSaving(false);
  }, [card]);

  const labelOptions = useMemo(() => {
    if (card?.label && !LABEL_OPTIONS.includes(card.label)) {
      return [card.label, ...LABEL_OPTIONS];
    }
    return LABEL_OPTIONS;
  }, [card?.label]);

  const assigneeOptions = useMemo(() => {
    const options = [
      { value: '', label: 'Unassigned' },
      ...members.map((member) => ({
        value: member.userId,
        label: member.displayName,
      })),
    ];
    if (card?.assigneeId && !members.some((member) => member.userId === card.assigneeId)) {
      options.push({ value: card.assigneeId, label: 'Former member' });
    }
    return options;
  }, [members, card?.assigneeId]);

  const dirty =
    Boolean(card) &&
    (title.trim() !== card?.title ||
      description !== card?.description ||
      listId !== card?.listId ||
      priority !== card?.priority ||
      (label ?? null) !== card?.label ||
      (dueDate || null) !== card?.dueDate ||
      (assigneeId || null) !== card?.assigneeId);

  if (!card) return null;

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty || isSaving) return;

    const trimmed = title.trim();
    if (!trimmed) {
      setError('A card title is required.');
      return;
    }

    const patch: CardPatchInput = {};
    if (trimmed !== card.title) patch.title = trimmed;
    if (description !== card.description) patch.description = description;
    if (listId !== card.listId) patch.listId = listId;
    if (priority !== card.priority) patch.priority = priority;
    if ((label ?? null) !== card.label) patch.label = label;
    if ((dueDate || null) !== card.dueDate) patch.dueDate = dueDate || null;
    if ((assigneeId || null) !== card.assigneeId) patch.assigneeId = assigneeId || null;

    setIsSaving(true);
    setError(null);
    const result = await onSave(card.id, patch);
    setIsSaving(false);

    if (result.ok) onClose();
    else setError(result.error ?? 'The card could not be saved.');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    const ok = await onDelete(card.id);
    setIsDeleting(false);
    setConfirmOpen(false);
    if (ok) onClose();
    else setError('The card could not be deleted.');
  };

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title="Card details"
        description="Update anything about this card — changes sync instantly."
        size="lg"
        closeOnOverlayClick={!isSaving}
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="btn mr-auto gap-1.5 text-danger hover:bg-danger-soft"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
            <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="card-detail-form"
              isLoading={isSaving}
              disabled={!dirty || !title.trim()}
            >
              Save changes
            </Button>
          </>
        }
      >
        <form id="card-detail-form" onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <Alert variant="danger" title="Could not save the card">
              {error}
            </Alert>
          ) : null}

          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={500}
            required
          />

          <TextareaField
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Add context, links, or acceptance criteria…"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="List"
              value={listId}
              onChange={(event) => setListId(event.target.value)}
              options={lists.map((list) => ({ value: list.id, label: list.title }))}
            />
            <SelectField
              label="Assignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              options={assigneeOptions}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Due date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              leadingIcon={<CalendarDays className="h-4 w-4" aria-hidden="true" />}
              hint={
                card.dueDate
                  ? formatDueDate(card.dueDate)?.text
                  : 'Optional — helps surface the card on your dashboard.'
              }
            />
            <div className="rounded-2xl border border-surface-column/70 bg-surface-muted/40 px-3.5 py-2.5">
              <p className="text-xs text-ink-faint">Created</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-ink">
                <Clock className="h-3 w-3 text-ink-faint" aria-hidden="true" />
                {formatRelativeTime(card.createdAt)}
              </p>
              <p className="mt-2 text-xs text-ink-faint">Updated</p>
              <p className="mt-0.5 text-xs font-medium text-ink">
                {formatRelativeTime(card.updatedAt)}
              </p>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-ink">Priority</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRIORITY_OPTIONS.map((option) => {
                const style = priorityStyles[option];
                const selected = priority === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setPriority(option)}
                    className={cn(
                      'badge cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                      style.badge,
                      selected ? 'ring-2 ring-ink/20' : 'opacity-65 hover:opacity-100'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} aria-hidden="true" />
                    {style.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium text-ink">Label</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                aria-pressed={label === null}
                onClick={() => setLabel(null)}
                className={cn(
                  'badge cursor-pointer border border-surface-column bg-surface-muted text-ink-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  label === null ? 'ring-2 ring-ink/20' : 'opacity-65 hover:opacity-100'
                )}
              >
                None
              </button>
              {labelOptions.map((option) => {
                const selected = label === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setLabel(option)}
                    className={cn(
                      'badge cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                      getLabelStyle(option),
                      selected ? 'ring-2 ring-ink/20' : 'opacity-65 hover:opacity-100'
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete this card?"
        description={`“${card.title}” will be permanently removed from this board.`}
        confirmLabel="Delete card"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!isDeleting) setConfirmOpen(false);
        }}
      />
    </>
  );
}
