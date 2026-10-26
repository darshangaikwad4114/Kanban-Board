import type { ReactNode } from 'react';
import { Brand } from './Brand';
import { UserMenu } from './UserMenu';

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Brand href="/dashboard" />
        <div className="flex items-center gap-2 sm:gap-3">
          {children}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
