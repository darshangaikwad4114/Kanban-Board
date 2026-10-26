'use client';

import { BOARD_TEMPLATES, templateCardCount } from '@/config/templates';
import { getBoardColorStyle } from '@/config/theme';
import { cn } from '@/lib/utils';
import { TemplateGlyph } from '@/components/board/TemplateIcon';

export function TemplateStrip({ onSelect }: { onSelect: (templateId: string) => void }) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Start from a template</h2>
          <p className="text-xs text-ink-muted">
            Pre-built lists and cards, ready in one click.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {BOARD_TEMPLATES.map((template) => {
          const style = getBoardColorStyle(template.color);
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={cn(
                'group rounded-2xl border border-surface-column/70 p-3.5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                style.soft
              )}
            >
              <span
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised/85 shadow-sm',
                  style.text
                )}
              >
                <TemplateGlyph icon={template.icon} className="h-4 w-4" />
              </span>
              <p className="mt-2.5 truncate text-sm font-semibold text-ink">
                {template.name}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-muted">
                {template.lists.length === 0
                  ? 'Empty canvas'
                  : `${template.lists.length} lists · ${templateCardCount(template)} cards`}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
