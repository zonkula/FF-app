import type { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  className?: string
  /** Tailwind padding classes - defaults to the spec's generous p-6, override for dense tables/lists. */
  padding?: string
  /** Persistent accent-glow border (e.g. the player whose turn it is), instead of only on hover. */
  active?: boolean
  /** Set false to disable the hover glow, e.g. for static/non-interactive cards. */
  hoverGlow?: boolean
}

/** DraftKings-style elevated card: slate-800 surface, slate-700 border, blue glow on hover or when active. */
export function Card({ children, className = '', padding = 'p-6', active = false, hoverGlow = true }: CardProps) {
  return (
    <div
      className={`rounded-xl border-2 bg-slate-800 shadow-lg transition-all duration-300 ${padding} ${
        active ? 'border-sky-500 shadow-xl shadow-blue-500/30' : 'border-slate-700'
      } ${hoverGlow && !active ? 'hover:border-sky-500 hover:shadow-xl hover:shadow-blue-500/20' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
