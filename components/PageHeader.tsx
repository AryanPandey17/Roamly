"use client"

import { LucideIcon } from "lucide-react"

export default function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  icon?: LucideIcon
  action?: React.ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action ?? (Icon && (
        <div className="soft-icon">
          <Icon />
        </div>
      ))}
    </div>
  )
}
