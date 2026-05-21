"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface PaginationControlsProps {
  page:       number
  totalPages: number
  totalCount: number
  pageSize:   number
  /** Returns the href for a given page number */
  buildHref:  (page: number) => string
  className?: string
}

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  pageSize,
  buildHref,
  className,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, totalCount)
  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <div className={cn("flex items-center justify-between gap-4 py-2", className)}>
      {/* Result count */}
      <p className="text-xs text-muted-foreground tabular-nums">
        {from}–{to} de {totalCount.toLocaleString("es-AR")}
      </p>

      {/* Controls */}
      <div className="flex items-center gap-1">
        {/* Primera */}
        <Button
          asChild={hasPrev}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasPrev}
        >
          {hasPrev ? (
            <Link href={buildHref(1)} aria-label="Primera página">
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span><ChevronsLeft className="h-3.5 w-3.5" /></span>
          )}
        </Button>

        {/* Anterior */}
        <Button
          asChild={hasPrev}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasPrev}
        >
          {hasPrev ? (
            <Link href={buildHref(page - 1)} aria-label="Página anterior">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span><ChevronLeft className="h-3.5 w-3.5" /></span>
          )}
        </Button>

        {/* Página actual */}
        <span className="px-2 text-xs font-medium tabular-nums text-muted-foreground">
          {page} / {totalPages}
        </span>

        {/* Siguiente */}
        <Button
          asChild={hasNext}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasNext}
        >
          {hasNext ? (
            <Link href={buildHref(page + 1)} aria-label="Página siguiente">
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span><ChevronRight className="h-3.5 w-3.5" /></span>
          )}
        </Button>

        {/* Última */}
        <Button
          asChild={hasNext}
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasNext}
        >
          {hasNext ? (
            <Link href={buildHref(totalPages)} aria-label="Última página">
              <ChevronsRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span><ChevronsRight className="h-3.5 w-3.5" /></span>
          )}
        </Button>
      </div>
    </div>
  )
}
