'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { TextField, TextareaField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { createBoard } from '@/services/boards.service';
import { toFieldErrors, toUserMessage } from '@/lib/errors';
import { getBoardColorStyle } from '@/config/theme';
import { BOARD_TEMPLATES, getTemplateById, templateCardCount } from '@/config/templates';
import { cn } from '@/lib/utils';
import { boardSchema } from '@/lib/validation';
import type { BoardColor } from '@/types/domain';
import { ColorPicker } from './ColorPicker';
import { TemplateGlyph } from './TemplateIcon';

interface CreateBoardModalProps {
  open: boolean;
  initialTemplateId?: string | null;
  onClose: () => void;
  onCreated: (boardId: string) => void;
}

const DEFAULT_TEMPLATE_ID = 'basic-kanban';

export function CreateBoardModal({
  open,
  initialTemplateId,
  onClose,
  onCreated,
}: CreateBoardModalProps) {
  const toast = useToast();
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<BoardColor>('lavender');
  const [templateId, setTemplateId] = useState(DEFAULT_TEMPLATE_ID);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    const template =
      getTemplateById(initialTemplateId) ?? getTemplateById(DEFAULT_TEMPLATE_ID);

    setTitle('');
    setDescription('');
    setColor(template?.color ?? 'lavender');
    setTemplateId(template?.id ?? 'blank');
    setFieldErrors({});
    setError(null);
    setIsCreating(false);
  }, [open, initialTemplateId]);

  const selectedTemplate = getTemplateById(templateId);

  const handleTemplateSelect = (id: string) => {
    const template = getTemplateById(id);
    setTemplateId(id);
    if (template) setColor(template.color);
  };

  const handleClose = () => {
    if (isCreating) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isCreating) return;

    const parsed = boardSchema.safeParse({ title, description, color, templateId });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }

    setFieldErrors({});
    setError(null);
    setIsCreating(true);

    try {
      const boardId = await createBoard(parsed.data);
      toast.success('Board created', `“${parsed.data.title}” is ready to use.`);
      onCreated(boardId);
      onClose();
    } catch (cause) {
      const message = toUserMessage(cause, 'The board could not be created.');
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create a board"
      description="Name it, pick a colour, and start from a template or an empty canvas."
      size="xl"
      initialFocusRef={titleRef}
      closeOnOverlayClick={!isCreating}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-board-form"
            isLoading={isCreating}
            leadingIcon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
          >
            {isCreating ? 'Creating…' : 'Create board'}
          </Button>
        </>
      }
    >
      <form id="create-board-form" onSubmit={handleSubmit} className="space-y-6">
        {error ? (
          <Alert variant="danger" title="Could not create the board">
            {error}
          </Alert>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            ref={titleRef}
            label="Board name"
            placeholder="e.g. Product roadmap"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            error={fieldErrors.title}
            maxLength={200}
            required
          />
          <TextField
            label="Description"
            placeholder="Optional — what is this board for?"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            error={fieldErrors.description}
            maxLength={500}
            hint="Up to 500 characters."
          />
        </div>

        <ColorPicker value={color} onChange={setColor} disabled={isCreating} />

        <fieldset>
          <legend className="text-sm font-medium text-ink">Starting point</legend>
          <p className="mt-0.5 text-xs text-ink-faint">
            Templates add lists and sample cards so you can begin immediately.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {BOARD_TEMPLATES.map((template) => {
              const selected = template.id === templateId;
              const style = getBoardColorStyle(template.color);
              const cardCount = templateCardCount(template);

              return (
                <button
                  key={template.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={cn(
                    'relative rounded-2xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                    selected
                      ? 'border-accent/50 bg-accent-soft/50 shadow-card'
                      : 'border-surface-column/80 bg-surface-raised hover:border-accent/30 hover:bg-surface-muted/60'
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-xl',
                        style.soft,
                        style.text
                      )}
                    >
                      <TemplateGlyph icon={template.icon} className="h-4 w-4" />
                    </span>
                    {selected ? (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2 block truncate text-sm font-semibold text-ink">
                    {template.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">
                    {template.lists.length === 0
                      ? 'Empty canvas'
                      : `${template.lists.length} lists · ${cardCount} cards`}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedTemplate && selectedTemplate.lists.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-2xl bg-surface-muted/70 px-3 py-2.5">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                Columns
              </span>
              {selectedTemplate.lists.map((list) => (
                <span
                  key={list.title}
                  className="badge border border-surface-column bg-surface-raised text-[11px] text-ink-muted"
                >
                  {list.title}
                </span>
              ))}
            </div>
          ) : null}
        </fieldset>
      </form>
    </Modal>
  );
}
