import type { ReactNode } from 'react'
import { Badge, Card } from '@/components/common/controls'

export function SettingsSection({ id, title, description, badge, children }: { id: string; title: string; description?: string; badge?: string; children: ReactNode }) {
  return (
    <Card id={id} aria-labelledby={`${id}-title`} className="flex scroll-mt-6 flex-col gap-4 p-5">
      <div className="flex flex-col gap-0.5">
        <h2 id={`${id}-title`} className="flex items-center gap-2 text-base font-semibold">
          {title}
          {badge && <Badge>{badge}</Badge>}
        </h2>
        {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children}
    </Card>
  )
}
