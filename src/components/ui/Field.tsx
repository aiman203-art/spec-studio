import type { ReactNode } from 'react'
import type { FieldState, ProjectField } from '../../lib/fieldState'
import { isEmptyValue, withValue } from '../../lib/fieldState'

interface FieldProps<T> {
  label: string
  hint?: string
  field: ProjectField<T>
  onChange: (next: ProjectField<T>) => void
  /** Render the input. Receives current value + a setter that marks it filled/empty. */
  children: (args: {
    value: T
    disabled: boolean
    setValue: (v: T) => void
  }) => ReactNode
}

const microBtn =
  'rounded-pill border px-2 py-0.5 text-caption transition-colors'

export function Field<T>({
  label,
  hint,
  field,
  onChange,
  children,
}: FieldProps<T>) {
  const dimmed = field.state === 'skipped' || field.state === 'na'

  function setState(state: FieldState) {
    onChange({ ...field, state })
  }
  function setValue(v: T) {
    onChange(withValue(field, v))
  }

  return (
    <div className={dimmed ? 'opacity-55' : ''}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label className="text-caption text-muted">{label}</label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setState('skipped')}
            className={[
              microBtn,
              field.state === 'skipped'
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-border text-faint hover:text-muted',
            ].join(' ')}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => setState('na')}
            className={[
              microBtn,
              field.state === 'na'
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-border text-faint hover:text-muted',
            ].join(' ')}
          >
            N/A
          </button>
          {dimmed && (
            <button
              type="button"
              onClick={() => setState(isEmptyValue(field.value) ? 'empty' : 'filled')}
              className={[microBtn, 'border-border text-accent hover:text-accent-hover'].join(' ')}
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {children({ value: field.value, disabled: dimmed, setValue })}
      {dimmed ? (
        <p className="mt-1 text-caption text-faint">
          {field.state === 'skipped' ? 'Skipped' : 'Not applicable'} — excluded from research.
        </p>
      ) : hint ? (
        <p className="mt-1 text-caption text-faint">{hint}</p>
      ) : null}
    </div>
  )
}

/** Standard text input matching the dark theme; pass through to Field's children. */
export function TextInput({
  value,
  disabled,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string | number
  disabled: boolean
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-body text-ink placeholder:text-faint focus-visible:ring-focus disabled:cursor-not-allowed"
    />
  )
}
