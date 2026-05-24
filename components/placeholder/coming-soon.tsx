import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ComingSoonProps {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
}

export function ComingSoon({ icon: Icon, title, description, badge }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="max-w-sm text-center space-y-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto">
          <Icon className="w-8 h-8 text-brand" />
        </div>

        {/* Text */}
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed font-sans">
            {description}
          </p>
        </div>

        {/* Badge */}
        {badge && (
          <div className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium font-sans",
            "bg-brand/10 text-brand border border-brand/20"
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
            {badge}
          </div>
        )}
      </div>
    </div>
  )
}
