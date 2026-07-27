'use client';

import type { ActivityLog } from '@kanban/shared';
import { formatRelativeTime } from '@/lib/theme';

interface ActivitySidebarProps {
  open: boolean;
  onClose: () => void;
  logs: ActivityLog[];
}

const actionIcons: Record<string, string> = {
  created: '✦',
  updated: '↻',
  deleted: '×',
  moved: '→',
  template: '📋',
};

function getActionIcon(action: string) {
  for (const [key, icon] of Object.entries(actionIcons)) {
    if (action.includes(key)) return icon;
  }
  return '•';
}

export function ActivitySidebar({ open, onClose, logs }: ActivitySidebarProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-ink/10 z-40 lg:hidden" onClick={onClose} aria-hidden="true" />
      )}
      <aside
        className={`fixed top-0 right-0 h-full w-80 bg-surface-raised border-l border-surface-column shadow-modal z-50 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Activity feed"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-column/60">
          <div>
            <h2 className="font-semibold text-ink">Activity</h2>
            <p className="text-xs text-ink-muted">Recent board changes</p>
          </div>
          <button onClick={onClose} className="btn-ghost !p-2 rounded-xl" aria-label="Close activity">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-ink-muted text-center py-8">No activity yet</p>
          ) : (
            logs.map((log) => (
              <div key={log._id} className="flex gap-3 p-3 rounded-2xl bg-surface-muted/60">
                <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-sm shrink-0">
                  {getActionIcon(log.action)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-ink">
                    <span className="font-medium">{log.userName.split('@')[0]}</span>{' '}
                    <span className="text-ink-muted">{log.action}</span>
                  </p>
                  {log.details && (
                    <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">{log.details}</p>
                  )}
                  <p className="text-xs text-ink-faint mt-1">{formatRelativeTime(log.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
