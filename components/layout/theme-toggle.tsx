"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch — only render after mount
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="w-8 h-8" />

  const isDark = resolvedTheme === "dark"

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark ? (
        <Sun className="h-4 w-4 transition-transform" />
      ) : (
        <Moon className="h-4 w-4 transition-transform" />
      )}
      <span className="sr-only">{isDark ? "Modo claro" : "Modo oscuro"}</span>
    </Button>
  )
}
