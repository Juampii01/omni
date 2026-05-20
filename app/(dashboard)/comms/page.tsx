import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Construction } from "lucide-react"

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader title="comms" />
      <Card className="border-border shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Construction className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">En construcción</p>
          <p className="text-xs text-muted-foreground mt-1">Esta sección está siendo desarrollada. Fase 2+.</p>
        </CardContent>
      </Card>
    </div>
  )
}
