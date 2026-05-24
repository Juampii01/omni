"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FileEdit, Instagram } from "lucide-react"
import type { ReactNode } from "react"

interface Props {
  calendarTab: ReactNode
  instagramTab: ReactNode
  defaultTab: string
}

export function ContentTabs({ calendarTab, instagramTab, defaultTab }: Props) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue={defaultTab}>
        <TabsList className="h-9">
          <TabsTrigger value="calendar" className="gap-2 text-xs">
            <FileEdit className="w-3.5 h-3.5" />
            Calendario
          </TabsTrigger>
          <TabsTrigger value="instagram" className="gap-2 text-xs">
            <Instagram className="w-3.5 h-3.5" />
            Instagram
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calendar" className="mt-6">
          {calendarTab}
        </TabsContent>

        <TabsContent value="instagram" className="mt-6">
          {instagramTab}
        </TabsContent>
      </Tabs>
    </div>
  )
}
