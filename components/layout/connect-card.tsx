"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function ConnectCard({
  icon: Icon,
  title,
  description,
  cta,
}: {
  icon: React.ElementType
  title: string
  description: string
  cta: string
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
          <Icon className="h-5 w-5 text-accent-foreground" strokeWidth={1.75} />
        </div>
        <div>
          <p className="font-heading text-lg">{title}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        </div>
        <Button className="mt-2" onClick={() => toast.info("Todavía no está disponible — falta configurar la integración.")}>
          {cta}
        </Button>
      </CardContent>
    </Card>
  )
}
