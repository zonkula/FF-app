export interface PagePlaceholderProps {
  title: string
  description: string
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div className="mx-auto max-w-5xl p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
      <p className="mt-2 text-sm text-gray-400">{description}</p>
    </div>
  )
}
