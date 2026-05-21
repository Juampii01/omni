import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Construction } from "lucide-react"

export const metadata = { title: "Pipeline — Omni" }

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipeline"
        description="Vista kanban de tu proceso de ventas"
      />
      <Card className="border-border shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Construction className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">En construcción</p>
          <p className="text-xs text-muted-foreground mt-1">Kanban con drag & drop — próximamente.</p>
        </CardContent>
      </Card>
    </div>
  )
}
