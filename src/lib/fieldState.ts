/**
 * Field state model (ADR §Screen 2 — Form field state model).
 * Every project-setup field tracks one of these states and is passed to Claude
 * on every API call so research respects Skipped / N/A intent.
 */
export type FieldState = 'filled' | 'skipped' | 'na' | 'empty'

export interface ProjectField<T> {
  value: T
  state: FieldState
}

export function field<T>(value: T, state: FieldState = 'empty'): ProjectField<T> {
  return { value, state }
}

export function emptyField<T>(empty: T): ProjectField<T> {
  return { value: empty, state: 'empty' }
}

/** True when a field value carries no user content (empty string / null / blank location). */
export function isEmptyValue<T>(value: T): boolean {
  if (value === '' || value === null || value === undefined) return true
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    if ('address' in v) return !v.address // LocationValue
  }
  return false
}

/** Derive state from a value when the user types/clears (filled vs empty). */
export function withValue<T>(_prev: ProjectField<T>, value: T): ProjectField<T> {
  return { value, state: isEmptyValue(value) ? 'empty' : 'filled' }
}

/** Human-readable rendering of a field for prompts / summaries. */
export function describeField<T>(f: ProjectField<T>): string {
  switch (f.state) {
    case 'skipped':
      return '(skipped)'
    case 'na':
      return '(not applicable)'
    case 'empty':
      return '(not provided)'
    case 'filled':
      return String(f.value)
  }
}
