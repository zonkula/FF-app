import type { InputHTMLAttributes } from 'react'

/** Shared with <select> elements, which need the same look but can't use the Input component directly. */
export const FORM_CONTROL_CLASSES =
  'rounded-md border-2 border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white transition-all duration-300 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/30'

/** DraftKings-style form input: dark surface, glowing focus ring. */
export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`min-h-[48px] ${FORM_CONTROL_CLASSES} ${className}`} />
}
