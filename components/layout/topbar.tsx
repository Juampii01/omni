"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserMenu } from "./user-menu"

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 flex-shrink-0">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden h-8 w-8"
        onClick={onMenuClick}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Spacer — breadcrumbs or page title could go here in future */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </header>
  )
}
