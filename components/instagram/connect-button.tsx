"use client"

import { Button } from "@/components/ui/button"
import { Instagram } from "lucide-react"

export function IGConnectButton() {
  return (
    <Button
      asChild
      className="bg-brand hover:bg-brand/90 text-brand-foreground gap-2"
    >
      <a href="/api/instagram/oauth/start">
        <Instagram className="w-4 h-4" />
        Conectar Instagram
      </a>
    </Button>
  )
}
