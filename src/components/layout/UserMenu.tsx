'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut, UserRound } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/ui/Avatar';
import { MenuDivider, MenuItem, Popover } from '@/components/ui/Popover';
import { ProfileSettingsModal } from './ProfileSettingsModal';

export function UserMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) return null;

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await logout();
    setIsSigningOut(false);
    router.replace('/auth/login');
  };

  return (
    <>
      <Popover
        label="Account menu"
        trigger={({ ref, open, toggle, ...aria }) => (
          <button
            ref={ref}
            type="button"
            onClick={toggle}
            className="flex items-center gap-2 rounded-full border border-surface-column bg-surface-raised p-1 pr-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            aria-label="Open account menu"
            {...aria}
          >
            <Avatar name={user.name} seed={user.id} size="sm" />
            <span className="hidden max-w-[120px] truncate sm:block">{user.name}</span>
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        )}
      >
        {(close) => (
          <div className="space-y-0.5">
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <Avatar name={user.name} seed={user.id} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
                <p className="truncate text-xs text-ink-faint">{user.email}</p>
              </div>
            </div>
            <MenuDivider />
            <MenuItem
              icon={<UserRound className="h-4 w-4" aria-hidden="true" />}
              onClick={() => {
                close();
                setProfileOpen(true);
              }}
            >
              Profile settings
            </MenuItem>
            <MenuItem
              icon={
                isSigningOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                )
              }
              danger
              disabled={isSigningOut}
              onClick={() => {
                close();
                void handleSignOut();
              }}
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </MenuItem>
          </div>
        )}
      </Popover>
      <ProfileSettingsModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
