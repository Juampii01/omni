"use client"

import { Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserMenu } from "./user-menu"
import { CommandPalette } from "./command-palette"
import { ThemeToggle } from "./theme-toggle"
import { useEffect, useState } from "react"

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const [isMac, setIsMac] = useState(true)

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes("MAC"))
  }, [])

  function openPalette() {
    const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })
    document.dispatchEvent(e)
  }

  return (
    <header className="h-14 border-b border-border bg-background/95 flex items-center justify-between px-4 flex-shrink-0 backdrop-blur-sm">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-8 w-8"
        onClick={onMenuClick}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Cmd+K search bar */}
      <div className="flex-1 max-w-sm mx-4 hidden sm:block">
        <button
          onClick={openPalette}
          className="w-full flex items-center gap-2.5 h-8 px-3 rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground hover:bg-muted hover:border-brand/30 transition-all duration-200 group"
        >
          <Search className="h-3.5 w-3.5 shrink-0 group-hover:text-brand transition-colors" />
          <span className="flex-1 text-left">Buscar o navegar…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70">
            {isMac ? "⌘" : "Ctrl"}K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8" onClick={openPalette}>
          <Search className="h-4 w-4" />
        </Button>
        <ThemeToggle />
        <UserMenu />
      </div>

      <CommandPalette />
    </header>
  )
}
