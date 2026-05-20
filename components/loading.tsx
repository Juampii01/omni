import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingProps {
  className?: string
  size?: "sm" | "md" | "lg"
}

export function Loading({ className, size = "md" }: LoadingProps) {
  const sizes = { sm: "h-4 w-4", md: "h-6 w-6", lg: "h-8 w-8" }
  return (
    <div className={cn("flex items-center justify-center py-8", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizes[size])} />
    </div>
  )
}

export function LoadingPage() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
