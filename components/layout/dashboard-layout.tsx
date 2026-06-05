"use client"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { AiChatWidget } from "@/components/ai-chat-widget"

interface DashboardLayoutProps {
  children: React.ReactNode
  businessName?: string
}

export function DashboardLayout({ children, businessName }: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar — 240px per spec */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 border-r border-sidebar-border bg-sidebar">
        <Sidebar businessName={businessName} />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 bg-sidebar border-r border-sidebar-border">
          <SheetHeader className="sr-only">
            <SheetTitle>Navegación</SheetTitle>
          </SheetHeader>
          <Sidebar businessName={businessName} onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      <Toaster richColors position="top-right" closeButton />
      <AiChatWidget />
    </div>
  )
}
