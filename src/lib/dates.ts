const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DueTone = 'danger' | 'warning' | 'default' | 'muted' | 'success';

/** Parses YYYY-MM-DD in local time, avoiding the UTC day-shift bug. */
export function parseDateOnly(value: string): Date | null {
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDueDate(
  value: string | null
): { text: string; tone: DueTone; isOverdue: boolean } | null {
  if (!value) return null;

  const due = parseDateOnly(value);
  if (!due) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  if (diff < 0) {
    return {
      text: diff === -1 ? 'Overdue by 1 day' : `Overdue by ${Math.abs(diff)} days`,
      tone: 'danger',
      isOverdue: true,
    };
  }
  if (diff === 0) return { text: 'Due today', tone: 'warning', isOverdue: false };
  if (diff === 1) return { text: 'Due tomorrow', tone: 'default', isOverdue: false };
  if (diff <= 7) return { text: `Due in ${diff} days`, tone: 'default', isOverdue: false };

  return {
    text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    tone: 'muted',
    isOverdue: false,
  };
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
