"use client"

import { Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserMenu } from "./user-menu"
import { CommandPalette } from "./command-palette"
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
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 flex-shrink-0">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={onMenuClick}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Search / Cmd+K */}
      <div className="flex-1 max-w-sm mx-4 hidden sm:block">
        <button
          onClick={openPalette}
          className="w-full flex items-center gap-2.5 h-8 px-3 rounded-lg border border-border bg-muted/60 text-xs text-muted-foreground hover:border-brand/40 hover:text-foreground transition-all duration-200 font-sans group"
        >
          <Search className="h-3.5 w-3.5 shrink-0 group-hover:text-brand transition-colors" />
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground/70 font-sans">
            {isMac ? "⌘" : "Ctrl"}K
          </kbd>
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8 text-muted-foreground" onClick={openPalette}>
          <Search className="h-4 w-4" />
        </Button>
        <UserMenu />
      </div>

      <CommandPalette />
    </header>
  )
}
