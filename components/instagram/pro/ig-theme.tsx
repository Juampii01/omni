import React from "react"

// Gradiente estilo Instagram
export const IG_GRADIENT = "linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)"
export const IG_GRADIENT_CSS = "bg-[linear-gradient(135deg,#833AB4_0%,#FD1D1D_50%,#FCB045_100%)]"

// Para texto con gradiente
export const IG_TEXT_GRADIENT =
  "bg-[linear-gradient(135deg,#833AB4_0%,#FD1D1D_50%,#FCB045_100%)] bg-clip-text text-transparent"

// Anillo de avatar: envuelve el avatar en un borde gradiente
export function IGAvatarRing({
  children,
  size = "lg",
  hasStory = false,
}: {
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl"
  hasStory?: boolean
}) {
  const sizes = { sm: "w-10 h-10", md: "w-14 h-14", lg: "w-20 h-20", xl: "w-28 h-28" }
  if (!hasStory) return <>{children}</>
  return (
    <div className={`rounded-full p-[2px] ${IG_GRADIENT_CSS} ${sizes[size]}`}>
      <div className="rounded-full bg-[var(--card)] p-[2px] w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  )
}

export function IGGradientText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`${IG_TEXT_GRADIENT} ${className}`}>{children}</span>
}
