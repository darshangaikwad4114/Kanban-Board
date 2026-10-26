'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Mail, UserRound } from 'lucide-react';
import { TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useToast } from '@/components/ui/Toast';
import { useAuthStore } from '@/stores/authStore';

interface ProfileSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProfileSettingsModal({ open, onClose }: ProfileSettingsModalProps) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const fieldErrors = useAuthStore((state) => state.fieldErrors);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const clearError = useAuthStore((state) => state.clearError);
  const clearFieldErrors = useAuthStore((state) => state.clearFieldErrors);
  const toast = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? '');
    clearError();
    clearFieldErrors();
  }, [open, user?.name, clearError, clearFieldErrors]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const success = await updateProfile(name);
    if (success) {
      toast.success('Profile updated', 'Your display name is now up to date.');
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Profile settings"
      description="This name is shown to everyone you share a board with."
      size="sm"
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="profile-settings-form" isLoading={isLoading}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="profile-settings-form" onSubmit={handleSubmit} className="space-y-4">
        {error ? <Alert variant="danger">{error}</Alert> : null}
        <TextField
          ref={nameRef}
          label="Display name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          autoComplete="name"
          required
          maxLength={80}
          error={fieldErrors.displayName}
          leadingIcon={<UserRound className="h-4 w-4" aria-hidden="true" />}
        />
        <TextField
          label="Email"
          value={user?.email ?? ''}
          readOnly
          disabled
          leadingIcon={<Mail className="h-4 w-4" aria-hidden="true" />}
          hint="Email changes are handled securely through your Supabase account."
        />
      </form>
    </Modal>
  );
}
