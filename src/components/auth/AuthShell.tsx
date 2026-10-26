import type { ReactNode } from 'react';
import { Check, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { Brand } from '@/components/layout/Brand';
import { cn } from '@/lib/utils';

function MiniColumn({
  dot,
  label,
  count,
  children,
}: {
  dot: string;
  label: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-2.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-white/65">
          <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
          {label}
        </span>
        <span className="text-[9px] font-medium text-white/30">{count}</span>
      </div>
      {children}
    </div>
  );
}

function MiniCard({
  title,
  tag,
  done = false,
  withAvatars = false,
}: {
  title: string;
  tag?: string;
  done?: boolean;
  withAvatars?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.07] bg-white/[0.07] p-2.5 shadow-sm backdrop-blur-sm',
        done && 'opacity-55'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium leading-snug text-white/85">{title}</p>
        {done ? (
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/25 text-success">
            <Check className="h-2.5 w-2.5" aria-hidden="true" />
          </span>
        ) : null}
      </div>
      {tag ? (
        <span className="mt-1.5 inline-flex rounded-md bg-accent/25 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/75">
          {tag}
        </span>
      ) : null}
      {withAvatars ? (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex -space-x-1.5">
            <span className="h-3.5 w-3.5 rounded-full border border-ink bg-sage" />
            <span className="h-3.5 w-3.5 rounded-full border border-ink bg-peach" />
            <span className="h-3.5 w-3.5 rounded-full border border-ink bg-sky" />
          </div>
          <span className="text-[8px] text-white/35">Today</span>
        </div>
      ) : null}
    </div>
  );
}

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[1.08fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-ink px-10 py-10 lg:flex lg:flex-col xl:px-14">
        <div
          className="pointer-events-none absolute inset-0 bg-grid opacity-60"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -left-32 top-16 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 right-0 h-96 w-96 rounded-full bg-sage/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative">
          <Brand tone="dark" size="lg" subtitle="Calm kanban for teams" />
        </div>

        <div className="relative my-auto py-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[11px] font-medium text-white/70">
            <Sparkles className="h-3 w-3 text-accent" aria-hidden="true" />
            A calmer way to ship work
          </span>
          <h1 className="mt-5 max-w-md text-balance text-4xl font-semibold leading-[1.15] tracking-tight text-white">
            Every task, deadline, and teammate in one clear view.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
            Flowboard pairs a thoughtful board with realtime sync, so your team always sees
            the same source of truth — without the busywork.
          </p>

          <div className="mt-9 max-w-xl animate-float-slow">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-4 shadow-2xl backdrop-blur-sm">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-white/20" />
                  <span className="h-2 w-2 rounded-full bg-white/15" />
                  <span className="h-2 w-2 rounded-full bg-white/10" />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-white/30">
                  Sprint 14
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <MiniColumn dot="bg-sky" label="Backlog" count={3}>
                  <MiniCard title="Shape onboarding" tag="Design" />
                  <MiniCard title="Draft release notes" />
                </MiniColumn>
                <MiniColumn dot="bg-warning" label="In progress" count={2}>
                  <MiniCard title="Polish board header" tag="Feature" withAvatars />
                  <MiniCard title="Realtime presence" />
                </MiniColumn>
                <MiniColumn dot="bg-success" label="Done" count={4}>
                  <MiniCard title="Invite teammates" done />
                  <MiniCard title="Set up RLS" done />
                </MiniColumn>
              </div>
            </div>
          </div>

          <ul className="mt-8 grid gap-3 text-xs text-white/55 sm:grid-cols-3">
            <li className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden="true" />
              Realtime by default
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 shrink-0 text-sage" aria-hidden="true" />
              Invite your team
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-sky" aria-hidden="true" />
              Secure and private
            </li>
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-[11px] text-white/30">
          <span>© {new Date().getFullYear()} Flowboard</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Row Level Security enabled
          </span>
        </div>
      </aside>

      <main className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12">
        <div className="lg:hidden">
          <Brand href="/" />
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[26rem]">
            <div className="mb-7 animate-fade-in">
              <h1 className="text-balance text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
                {title}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
            </div>
            {children}
            {footer ? (
              <div className="mt-6 text-center text-sm text-ink-muted">{footer}</div>
            ) : null}
          </div>
        </div>

        <p className="text-center text-[11px] text-ink-faint lg:text-left">
          Your data stays in your own Supabase project.
        </p>
      </main>
    </div>
  );
}
