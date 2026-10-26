'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { TextField, TextareaField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { toFieldErrors } from '@/lib/errors';
import { boardUpdateSchema, type BoardUpdateInput } from '@/lib/validation';
import type { Board, BoardColor } from '@/types/domain';
import { ColorPicker } from './ColorPicker';

export interface BoardSaveResult {
  ok: boolean;
  error?: string;
}

interface BoardSettingsModalProps {
  open: boolean;
  board: Board | null;
  onClose: () => void;
  onSave: (input: BoardUpdateInput) => Promise<BoardSaveResult>;
}

export function BoardSettingsModal({
  open,
  board,
  onClose,
  onSave,
}: BoardSettingsModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<BoardColor>('lavender');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open || !board) return;
    setTitle(board.title);
    setDescription(board.description);
    setColor(board.color);
    setFieldErrors({});
    setError(null);
    setIsSaving(false);
  }, [open, board]);

  const trimmedTitle = title.trim();
  const trimmedDescription = description.trim();
  const isDirty =
    Boolean(board) &&
    (trimmedTitle !== board?.title ||
      trimmedDescription !== board?.description ||
      color !== board?.color);

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || !board) return;

    const parsed = boardUpdateSchema.safeParse({ title, description, color });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    if (!isDirty) return;

    setFieldErrors({});
    setError(null);
    setIsSaving(true);

    const result = await onSave(parsed.data);
    setIsSaving(false);

    if (result.ok) {
      onClose();
    } else {
      setError(result.error ?? 'The board could not be updated.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Board settings"
      description="Update the name, description, and colour shown to everyone."
      size="md"
      initialFocusRef={titleRef}
      closeOnOverlayClick={!isSaving}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="board-settings-form"
            isLoading={isSaving}
            disabled={!isDirty}
            leadingIcon={<Save className="h-4 w-4" aria-hidden="true" />}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </Button>
        </>
      }
    >
      <form id="board-settings-form" onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <Alert variant="danger" title="Could not save changes">
            {error}
          </Alert>
        ) : null}

        <TextField
          ref={titleRef}
          label="Board name"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          error={fieldErrors.title}
          maxLength={200}
          required
        />
        <TextareaField
          label="Description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          error={fieldErrors.description}
          maxLength={500}
          rows={3}
          hint="Up to 500 characters."
          placeholder="What is this board for?"
        />
        <ColorPicker value={color} onChange={setColor} disabled={isSaving} />
      </form>
    </Modal>
  );
}
