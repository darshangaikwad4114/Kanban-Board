'use client';

import { useRef } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  tone = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const Icon = tone === 'danger' ? AlertTriangle : Info;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      initialFocusRef={cancelRef}
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-1">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
            tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-accent-hover'
          )}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
      </div>
    </Modal>
  );
}
