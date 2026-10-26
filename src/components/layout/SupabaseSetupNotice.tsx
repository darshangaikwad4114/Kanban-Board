'use client';

import { Database, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SupabaseSetupNotice({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-warning/30 bg-warning-soft/60 p-5 text-sm',
        className
      )}
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
          <Database className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">Connect your Supabase project</p>
          <p className="mt-1 leading-relaxed text-ink-muted">
            Account and board data lives in your own Supabase project. Create{' '}
            <code className="rounded bg-white/70 px-1 py-0.5 text-[11px] text-ink">
              .env.local
            </code>{' '}
            with:
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-ink px-4 py-3 text-[11px] leading-relaxed text-white/90">
{`NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>`}
          </pre>
          <p className="mt-3 text-xs leading-relaxed text-ink-muted">
            Run the SQL migrations in{' '}
            <code className="rounded bg-white/70 px-1 py-0.5 text-[11px] text-ink">
              supabase/migrations
            </code>
            , then restart the dev server. Only browser-safe keys belong here — never the
            service_role key.
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Row Level Security protects every table.
          </p>
        </div>
      </div>
    </div>
  );
}
