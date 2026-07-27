import type { BoardColor } from '@kanban/shared';

export const boardColorStyles: Record<
  BoardColor | string,
  { bg: string; soft: string; border: string; text: string; gradient: string }
> = {
  lavender: {
    bg: 'bg-accent',
    soft: 'bg-accent-soft',
    border: 'border-accent/30',
    text: 'text-accent-hover',
    gradient: 'from-accent-soft to-surface-raised',
  },
  sage: {
    bg: 'bg-sage',
    soft: 'bg-sage-soft',
    border: 'border-sage/30',
    text: 'text-sage',
    gradient: 'from-sage-soft to-surface-raised',
  },
  peach: {
    bg: 'bg-peach',
    soft: 'bg-peach-soft',
    border: 'border-peach/30',
    text: 'text-peach',
    gradient: 'from-peach-soft to-surface-raised',
  },
  sky: {
    bg: 'bg-sky',
    soft: 'bg-sky-soft',
    border: 'border-sky/30',
    text: 'text-sky',
    gradient: 'from-sky-soft to-surface-raised',
  },
  rose: {
    bg: 'bg-rose',
    soft: 'bg-rose-soft',
    border: 'border-rose/30',
    text: 'text-rose',
    gradient: 'from-rose-soft to-surface-raised',
  },
  sand: {
    bg: 'bg-sand',
    soft: 'bg-sand-soft',
    border: 'border-sand/30',
    text: 'text-sand',
    gradient: 'from-sand-soft to-surface-raised',
  },
};

export function getBoardColorStyle(color?: string) {
  return boardColorStyles[color || 'lavender'] || boardColorStyles.lavender;
}

export const priorityStyles = {
  none: { label: 'None', class: 'bg-surface-muted text-ink-muted' },
  low: { label: 'Low', class: 'bg-sage-soft text-sage' },
  medium: { label: 'Medium', class: 'bg-warning-soft text-warning' },
  high: { label: 'High', class: 'bg-danger-soft text-danger' },
} as const;

export const labelStyles: Record<string, string> = {
  Bug: 'bg-danger-soft text-danger',
  Feature: 'bg-accent-soft text-accent-hover',
  Design: 'bg-peach-soft text-peach',
  Planning: 'bg-sky-soft text-sky',
  Blog: 'bg-sage-soft text-sage',
  Social: 'bg-rose-soft text-rose',
  Urgent: 'bg-danger-soft text-danger',
};

export function getLabelStyle(label: string) {
  return labelStyles[label] || 'bg-surface-muted text-ink-muted';
}

export function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatDueDate(dateStr: string | null) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(date);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: 'Overdue', class: 'text-danger' };
  if (diff === 0) return { text: 'Due today', class: 'text-warning' };
  if (diff === 1) return { text: 'Due tomorrow', class: 'text-ink-muted' };
  return { text: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), class: 'text-ink-muted' };
}
