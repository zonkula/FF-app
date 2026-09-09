import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'warning'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Smaller padding/height for dense contexts (table rows, inline list actions) - the default size matches the full design-system spec (min-h-48px, px-6 py-3). */
  compact?: boolean
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-r from-blue-800 to-sky-500 text-white shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100',
  secondary: 'bg-slate-600 text-white shadow-md hover:bg-slate-500',
  outline: 'border-2 border-sky-500 text-sky-500 hover:bg-sky-500 hover:text-slate-900',
  danger: 'bg-red-500 text-white shadow-md hover:bg-red-600',
  warning: 'bg-amber-500 text-white shadow-md hover:bg-amber-600',
}

/** DraftKings-style action button. See design system spec: gradient primary, slate secondary, accent outline, red danger. */
export function Button({ variant = 'primary', compact = false, className = '', ...props }: ButtonProps) {
  const size = compact ? 'min-h-[40px] px-3 py-1.5 text-xs' : 'min-h-[48px] px-6 py-3 text-sm'
  return (
    <button
      {...props}
      className={`rounded-lg font-semibold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none ${VARIANT_CLASSES[variant]} ${size} ${className}`}
    />
  )
}
