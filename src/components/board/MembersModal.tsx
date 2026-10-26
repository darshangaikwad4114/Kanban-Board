'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { LogOut, Mail, UserMinus, UserPlus, Users } from 'lucide-react';
import { Alert, type AlertVariant } from '@/components/ui/Alert';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { formatRelativeTime } from '@/lib/dates';
import { isEmail } from '@/lib/utils';
import type { BoardMember, InviteResult } from '@/types/domain';

interface MembersModalProps {
  open: boolean;
  onClose: () => void;
  boardTitle: string;
  members: BoardMember[];
  currentUserId: string;
  isOwner: boolean;
  onInvite: (email: string) => Promise<InviteResult | null>;
  onRemove: (userId: string) => Promise<boolean>;
  onLeave: () => Promise<void>;
}

interface Feedback {
  variant: AlertVariant;
  message: string;
}

export function MembersModal({
  open,
  onClose,
  boardTitle,
  members,
  currentUserId,
  isOwner,
  onInvite,
  onRemove,
  onLeave,
}: MembersModalProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isInviting, setIsInviting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [removeTarget, setRemoveTarget] = useState<BoardMember | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail('');
    setEmailError(undefined);
    setFeedback(null);
    setRemoveTarget(null);
    setLeaveOpen(false);
    setIsInviting(false);
    setIsRemoving(false);
    setIsLeaving(false);
  }, [open]);

  const sortedMembers = useMemo(
    () =>
      [...members].sort((a, b) => {
        if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
        return a.joinedAt.localeCompare(b.joinedAt);
      }),
    [members]
  );

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const address = email.trim().toLowerCase();

    if (!address) {
      setEmailError('Enter an email address.');
      return;
    }
    if (!isEmail(address)) {
      setEmailError('Enter a valid email address.');
      return;
    }

    setEmailError(undefined);
    setFeedback(null);
    setIsInviting(true);
    const result = await onInvite(address);
    setIsInviting(false);

    if (result === 'invited') {
      setFeedback({
        variant: 'success',
        message: `${address} now has access to this board.`,
      });
      setEmail('');
      return;
    }
    if (result === 'already_member') {
      setFeedback({ variant: 'info', message: `${address} is already a member.` });
      return;
    }
    if (result === 'not_found') {
      setFeedback({
        variant: 'warning',
        message: `No account was found for ${address}. Ask them to sign up first, then add them here.`,
      });
      return;
    }
    setFeedback({
      variant: 'danger',
      message: 'The member could not be added. Check the email address and try again.',
    });
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    const ok = await onRemove(removeTarget.userId);
    setIsRemoving(false);

    if (ok) {
      setFeedback({
        variant: 'success',
        message: `${removeTarget.displayName} was removed from the board.`,
      });
      setRemoveTarget(null);
    } else {
      setFeedback({ variant: 'danger', message: 'The member could not be removed.' });
      setRemoveTarget(null);
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);
    await onLeave();
    setIsLeaving(false);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Board members"
        description={`${boardTitle} · ${members.length} ${
          members.length === 1 ? 'person has' : 'people have'
        } access.`}
        size="md"
        footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
      >
        <div className="space-y-5">
          {feedback ? (
            <Alert variant={feedback.variant} onDismiss={() => setFeedback(null)}>
              {feedback.message}
            </Alert>
          ) : null}

          {sortedMembers.length === 0 ? (
            <EmptyState
              compact
              icon={Users}
              title="No members yet"
              description="Members with access will appear here."
            />
          ) : (
            <ul className="divide-y divide-surface-column/60 overflow-hidden rounded-2xl border border-surface-column/80">
              {sortedMembers.map((member) => {
                const isYou = member.userId === currentUserId;
                const canRemove = isOwner && member.role !== 'owner' && !isYou;

                return (
                  <li
                    key={member.userId}
                    className="flex items-center gap-3 bg-surface-raised px-3.5 py-3"
                  >
                    <Avatar name={member.displayName} seed={member.userId} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                        {member.displayName}
                        {isYou ? (
                          <span className="badge bg-accent-soft text-[10px] text-accent-hover">
                            You
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[11px] text-ink-faint">
                        {member.role === 'owner' ? 'Board owner' : 'Member'} · joined{' '}
                        {formatRelativeTime(member.joinedAt)}
                      </p>
                    </div>
                    {member.role === 'owner' ? (
                      <span className="badge bg-accent-soft text-accent-hover">Owner</span>
                    ) : canRemove ? (
                      <button
                        type="button"
                        onClick={() => setRemoveTarget(member)}
                        aria-label={`Remove ${member.displayName}`}
                        className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      >
                        <UserMinus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <span className="badge bg-surface-muted text-ink-muted">Member</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {isOwner ? (
            <form
              onSubmit={handleInvite}
              className="rounded-2xl border border-surface-column/80 bg-surface-muted/40 p-3.5"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-hover">
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-ink">Add a member</h3>
                  <p className="text-[11px] text-ink-muted">
                    They can edit cards as soon as they are added.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="teammate@example.com"
                    aria-label="Member email address"
                    aria-invalid={emailError ? true : undefined}
                    className="input pl-9"
                  />
                </div>
                <Button type="submit" isLoading={isInviting} className="shrink-0">
                  Add member
                </Button>
              </div>
              {emailError ? (
                <p className="mt-1.5 text-xs font-medium text-danger">{emailError}</p>
              ) : (
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  They need an existing account with this email address.
                </p>
              )}
            </form>
          ) : (
            <div className="rounded-2xl border border-surface-column/80 bg-surface-muted/40 p-3.5">
              <h3 className="text-sm font-semibold text-ink">Leave this board</h3>
              <p className="mt-0.5 text-xs text-ink-muted">
                You will lose access until the owner adds you again.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 gap-1.5 border-danger/30 text-danger hover:bg-danger-soft"
                onClick={() => setLeaveOpen(true)}
                leadingIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
              >
                Leave board
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Remove this member?"
        description={
          removeTarget
            ? `${removeTarget.displayName} will lose access to ${boardTitle} and all of its cards.`
            : ''
        }
        confirmLabel="Remove member"
        isLoading={isRemoving}
        onConfirm={() => void handleRemove()}
        onCancel={() => {
          if (!isRemoving) setRemoveTarget(null);
        }}
      />

      <ConfirmDialog
        open={leaveOpen}
        title="Leave this board?"
        description={`You will lose access to ${boardTitle}. The owner can add you back later.`}
        confirmLabel="Leave board"
        tone="primary"
        isLoading={isLeaving}
        onConfirm={() => void handleLeave()}
        onCancel={() => {
          if (!isLeaving) setLeaveOpen(false);
        }}
      />
    </>
  );
}
