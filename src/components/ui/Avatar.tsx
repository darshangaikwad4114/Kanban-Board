'use client';

import { cn } from '@/lib/utils';
import { getAvatarLabel, getAvatarStyle } from '@/lib/theme';

const sizeClasses = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
} as const;

export type AvatarSize = keyof typeof sizeClasses;

interface AvatarProps {
  name: string;
  seed?: string;
  size?: AvatarSize;
  className?: string;
  ring?: boolean;
}

export function Avatar({ name, seed, size = 'md', className, ring = false }: AvatarProps) {
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold',
        getAvatarStyle(seed ?? name),
        ring && 'ring-2 ring-surface-raised',
        sizeClasses[size],
        className
      )}
    >
      {getAvatarLabel(name)}
    </span>
  );
}

interface AvatarStackProps {
  people: { id?: string; name: string }[];
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarStack({ people, max = 4, size = 'sm', className }: AvatarStackProps) {
  if (people.length === 0) return null;
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;
  const sizeValue = size === 'xs' ? 'h-6 w-6' : 'h-7 w-7';

  return (
    <div className={cn('flex items-center', className)}>
      <div className="flex -space-x-2">
        {visible.map((person, index) => (
          <Avatar
            key={`${person.id ?? person.name}-${index}`}
            name={person.name}
            seed={person.id}
            size={size}
            ring
          />
        ))}
        {overflow > 0 ? (
          <span
            className={cn(
              'inline-flex select-none items-center justify-center rounded-full bg-surface-column font-semibold text-ink-muted ring-2 ring-surface-raised',
              sizeValue,
              'text-[10px]'
            )}
            title={`${overflow} more`}
            aria-label={`${overflow} more collaborators`}
          >
            +{overflow}
          </span>
        ) : null}
      </div>
    </div>
  );
}
