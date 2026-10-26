'use client';

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldShellProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  hideLabel?: boolean;
  labelExtra?: ReactNode;
  containerClassName?: string;
  children: ReactNode;
}

function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  hideLabel,
  labelExtra,
  containerClassName,
  children,
}: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', containerClassName)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className={cn('text-sm font-medium text-ink', hideLabel && 'sr-only')}
        >
          {label}
          {required ? (
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        {labelExtra}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

function inputClasses(error?: string) {
  return cn('input', error && 'border-danger focus:border-danger focus:ring-danger/20');
}

interface FieldExtras {
  label: string;
  error?: string;
  hint?: string;
  labelExtra?: ReactNode;
  hideLabel?: boolean;
  containerClassName?: string;
}

export type TextFieldProps = FieldExtras &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    leadingIcon?: ReactNode;
    trailing?: ReactNode;
  };

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      error,
      hint,
      labelExtra,
      hideLabel,
      containerClassName,
      leadingIcon,
      trailing,
      className,
      id,
      required,
      ...props
    },
    ref
  ) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;

    return (
      <FieldShell
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        hideLabel={hideLabel}
        labelExtra={labelExtra}
        containerClassName={containerClassName}
      >
        <div className="relative">
          {leadingIcon ? (
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-faint">
              {leadingIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={fieldId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(fieldId, error, hint)}
            className={cn(
              inputClasses(error),
              leadingIcon ? 'pl-10' : undefined,
              trailing ? 'pr-11' : undefined,
              className
            )}
            {...props}
          />
          {trailing}
        </div>
      </FieldShell>
    );
  }
);

export type PasswordFieldProps = Omit<TextFieldProps, 'trailing' | 'type'>;

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <TextField
        ref={ref}
        className={className}
        type={visible ? 'text' : 'password'}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="absolute inset-y-0 right-1 flex items-center rounded-lg px-2 text-ink-faint transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        }
        {...props}
      />
    );
  }
);

export type TextareaFieldProps = FieldExtras &
  TextareaHTMLAttributes<HTMLTextAreaElement>;

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField(
    {
      label,
      error,
      hint,
      labelExtra,
      hideLabel,
      containerClassName,
      className,
      id,
      required,
      rows = 4,
      ...props
    },
    ref
  ) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;

    return (
      <FieldShell
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        hideLabel={hideLabel}
        labelExtra={labelExtra}
        containerClassName={containerClassName}
      >
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          className={cn(inputClasses(error), 'resize-y', className)}
          {...props}
        />
      </FieldShell>
    );
  }
);

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps
  extends FieldExtras,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  placeholder?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    {
      label,
      error,
      hint,
      labelExtra,
      hideLabel,
      containerClassName,
      className,
      id,
      required,
      options,
      placeholder,
      ...props
    },
    ref
  ) {
    const generatedId = useId();
    const fieldId = id ?? generatedId;

    return (
      <FieldShell
        id={fieldId}
        label={label}
        error={error}
        hint={hint}
        required={required}
        hideLabel={hideLabel}
        labelExtra={labelExtra}
        containerClassName={containerClassName}
      >
        <div className="relative">
          <select
            ref={ref}
            id={fieldId}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy(fieldId, error, hint)}
            className={cn(
              inputClasses(error),
              'cursor-pointer appearance-none pr-10',
              className
            )}
            {...props}
          >
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
        </div>
      </FieldShell>
    );
  }
);
