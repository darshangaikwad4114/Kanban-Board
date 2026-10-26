import type { Metadata } from 'next';
import { AuthShell } from '@/components/auth/AuthShell';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password',
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email tied to your account and we'll send a secure reset link."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
