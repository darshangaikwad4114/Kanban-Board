import type { BoardColor, CardPriority, ConnectionStatus } from '@/types/domain';
import type { DueTone } from '@/lib/dates';
import { initials } from '@/lib/utils';

export const boardColorStyles: Record<
  BoardColor,
  { bg: string; soft: string; border: string; text: string; gradient: string; dot: string }
> = {
  lavender: {
    bg: 'bg-accent',
    soft: 'bg-accent-soft',
    border: 'border-accent/30',
    text: 'text-accent-hover',
    gradient: 'from-accent-soft to-surface-raised',
    dot: 'bg-accent',
  },
  sage: {
    bg: 'bg-sage',
    soft: 'bg-sage-soft',
    border: 'border-sage/30',
    text: 'text-sage',
    gradient: 'from-sage-soft to-surface-raised',
    dot: 'bg-sage',
  },
  peach: {
    bg: 'bg-peach',
    soft: 'bg-peach-soft',
    border: 'border-peach/30',
    text: 'text-peach',
    gradient: 'from-peach-soft to-surface-raised',
    dot: 'bg-peach',
  },
  sky: {
    bg: 'bg-sky',
    soft: 'bg-sky-soft',
    border: 'border-sky/30',
    text: 'text-sky',
    gradient: 'from-sky-soft to-surface-raised',
    dot: 'bg-sky',
  },
  rose: {
    bg: 'bg-rose',
    soft: 'bg-rose-soft',
    border: 'border-rose/30',
    text: 'text-rose',
    gradient: 'from-rose-soft to-surface-raised',
    dot: 'bg-rose',
  },
  sand: {
    bg: 'bg-sand',
    soft: 'bg-sand-soft',
    border: 'border-sand/30',
    text: 'text-sand',
    gradient: 'from-sand-soft to-surface-raised',
    dot: 'bg-sand',
  },
};

export function getBoardColorStyle(color?: string | null) {
  return boardColorStyles[(color as BoardColor) || 'lavender'] ?? boardColorStyles.lavender;
}

export const priorityStyles: Record<
  CardPriority,
  { label: string; badge: string; dot: string; bar: string; text: string }
> = {
  none: {
    label: 'No priority',
    badge: 'bg-surface-muted text-ink-muted',
    dot: 'bg-ink-faint',
    bar: 'bg-surface-column',
    text: 'text-ink-muted',
  },
  low: {
    label: 'Low',
    badge: 'bg-sage-soft text-sage',
    dot: 'bg-sage',
    bar: 'bg-sage',
    text: 'text-sage',
  },
  medium: {
    label: 'Medium',
    badge: 'bg-warning-soft text-warning',
    dot: 'bg-warning',
    bar: 'bg-warning',
    text: 'text-warning',
  },
  high: {
    label: 'High',
    badge: 'bg-danger-soft text-danger',
    dot: 'bg-danger',
    bar: 'bg-danger',
    text: 'text-danger',
  },
};

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
  return labelStyles[label] ?? 'bg-surface-muted text-ink-muted';
}

const avatarPalette = [
  'bg-accent-soft text-accent-hover',
  'bg-sage-soft text-sage',
  'bg-peach-soft text-peach',
  'bg-sky-soft text-sky',
  'bg-rose-soft text-rose',
  'bg-sand-soft text-sand',
];

export function getAvatarStyle(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return avatarPalette[hash % avatarPalette.length];
}

export function getAvatarLabel(name: string) {
  return initials(name);
}

export const connectionStyles: Record<ConnectionStatus, { dot: string; label: string; text: string }> = {
  connected: { dot: 'bg-success', label: 'Live', text: 'text-success' },
  connecting: { dot: 'bg-warning animate-pulse', label: 'Connecting', text: 'text-warning' },
  reconnecting: { dot: 'bg-warning animate-pulse', label: 'Reconnecting', text: 'text-warning' },
  disconnected: { dot: 'bg-danger', label: 'Offline', text: 'text-danger' },
};

export const dueToneStyles: Record<DueTone, string> = {
  danger: 'text-danger',
  warning: 'text-warning',
  default: 'text-ink-muted',
  muted: 'text-ink-faint',
  success: 'text-success',
};
