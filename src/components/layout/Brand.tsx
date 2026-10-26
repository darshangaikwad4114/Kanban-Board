import Link from 'next/link';
import { Columns3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const markSizes = {
  sm: 'h-8 w-8 rounded-xl',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-11 w-11 rounded-2xl',
} as const;

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-[18px] w-[18px]',
  lg: 'h-5 w-5',
} as const;

const wordSizes = {
  sm: 'text-base',
  md: 'text-lg',
  lg: 'text-xl',
} as const;

interface BrandProps {
  href?: string;
  size?: keyof typeof markSizes;
  tone?: 'light' | 'dark';
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
}

export function Brand({
  href,
  size = 'md',
  tone = 'light',
  showWordmark = true,
  subtitle,
  className,
}: BrandProps) {
  const content = (
    <>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center bg-gradient-to-br from-accent to-accent-hover text-white shadow-soft',
          markSizes[size]
        )}
        aria-hidden="true"
      >
        <Columns3 className={iconSizes[size]} strokeWidth={2.4} />
      </span>
      {showWordmark ? (
        <span className="min-w-0">
          <span
            className={cn(
              'block font-semibold tracking-tight',
              tone === 'dark' ? 'text-white' : 'text-ink',
              wordSizes[size]
            )}
          >
            Flowboard
          </span>
          {subtitle ? (
            <span
              className={cn(
                'block text-xs',
                tone === 'dark' ? 'text-white/60' : 'text-ink-faint'
              )}
            >
              {subtitle}
            </span>
          ) : null}
        </span>
      ) : null}
    </>
  );

  const classNameString = cn('inline-flex items-center gap-2.5', className);

  if (href) {
    return (
      <Link href={href} className={classNameString} aria-label="Flowboard home">
        {content}
      </Link>
    );
  }

  return <span className={classNameString}>{content}</span>;
}
