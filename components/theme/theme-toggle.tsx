"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

// Transición cinematográfica: un círculo que se expande desde el punto del
// click y revela el tema nuevo (View Transitions API). Si el navegador no
// la soporta, cambia el tema directo sin animación — no rompe nada.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const isDark = mounted ? resolvedTheme === "dark" : true

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const nextTheme = isDark ? "light" : "dark"

    if (!document.startViewTransition) {
      setTheme(nextTheme)
      return
    }

    document.documentElement.style.setProperty("--theme-x", `${e.clientX}px`)
    document.documentElement.style.setProperty("--theme-y", `${e.clientY}px`)

    document.startViewTransition(() => {
      setTheme(nextTheme)
    })
  }

  return (
    <button
      type="button"
      aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
      onClick={handleClick}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
