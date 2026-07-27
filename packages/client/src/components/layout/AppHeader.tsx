'use client';

interface AppHeaderProps {
  userName?: string;
  onLogout?: () => void;
  backHref?: string;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppHeader({ userName, onLogout, backHref, onBack, title, subtitle, actions }: AppHeaderProps) {
  return (
    <header className="glass-header sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            {(backHref || onBack) && (
              <button
                onClick={onBack}
                className="btn-ghost !p-2 rounded-xl shrink-0"
                aria-label="Go back"
              >
                ←
              </button>
            )}
            <div className="min-w-0">
              {title ? (
                <>
                  <h1 className="text-lg font-semibold text-ink truncate">{title}</h1>
                  {subtitle && <p className="text-xs text-ink-muted truncate">{subtitle}</p>}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-accent-soft flex items-center justify-center text-accent-hover font-bold text-sm">
                    F
                  </div>
                  <span className="text-lg font-semibold text-ink">Flowboard</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {actions}
            {userName && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent-soft text-accent-hover flex items-center justify-center text-sm font-medium">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-ink-muted max-w-[120px] truncate">{userName}</span>
              </div>
            )}
            {onLogout && (
              <button onClick={onLogout} className="btn-secondary text-sm !py-2">
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
