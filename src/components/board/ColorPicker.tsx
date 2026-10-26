'use client';

import { Check } from 'lucide-react';
import { BOARD_COLORS, type BoardColor } from '@/types/domain';
import { boardColorStyles } from '@/config/theme';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: BoardColor;
  onChange: (color: BoardColor) => void;
  disabled?: boolean;
}

export function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">Board color</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {BOARD_COLORS.map((color) => {
          const selected = value === color;
          return (
            <button
              key={color}
              type="button"
              disabled={disabled}
              onClick={() => onChange(color)}
              aria-label={color}
              aria-pressed={selected}
              className={cn(
                'relative h-9 w-9 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2',
                boardColorStyles[color].bg,
                selected
                  ? 'scale-105 ring-2 ring-ink/25 ring-offset-2 ring-offset-surface-raised'
                  : 'opacity-75 hover:scale-105 hover:opacity-100'
              )}
            >
              {selected ? (
                <Check
                  className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow"
                  strokeWidth={3}
                  aria-hidden="true"
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
