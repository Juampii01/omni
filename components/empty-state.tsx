import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-4", className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs mb-4">{description}</p>
      )}
      {children}
    </div>
  )
}
