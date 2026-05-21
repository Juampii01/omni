"use client"

import { useState } from "react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"

interface UsePaginatedQueryOptions {
  tableName:  string
  select:     string
  /** Object of column → value equality filters. Nullish values are skipped. */
  filters?:   Record<string, string | number | boolean | null | undefined>
  /** { column, ascending } */
  orderBy?:   { column: string; ascending: boolean }
  pageSize?:  number
}

interface UsePaginatedQueryResult<T> {
  data:        T[]
  page:        number
  setPage:     (p: number) => void
  totalCount:  number
  totalPages:  number
  isLoading:   boolean
}

export function usePaginatedQuery<T = Record<string, unknown>>({
  tableName,
  select,
  filters,
  orderBy,
  pageSize = 50,
}: UsePaginatedQueryOptions): UsePaginatedQueryResult<T> {
  const [page, setPageRaw] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Stable key so SWR re-fetches when page / filters change
  const key = [tableName, select, page, pageSize, JSON.stringify(filters), JSON.stringify(orderBy)]

  const { data, isLoading } = useSWR<T[]>(key, async () => {
    const sb = createClient() as any
    let query = sb.from(tableName).select(select, { count: "exact" })

    // Apply equality filters
    if (filters) {
      for (const [col, val] of Object.entries(filters)) {
        if (val !== undefined && val !== null) {
          query = query.eq(col, val)
        }
      }
    }

    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending })
    }

    const from = (page - 1) * pageSize
    const to   = from + pageSize - 1
    query = query.range(from, to)

    const { data: rows, count, error } = await query
    if (error) throw error
    if (count !== null) setTotalCount(count)
    return (rows as T[]) ?? []
  })

  function setPage(p: number) {
    setPageRaw(Math.max(1, p))
  }

  const totalPages = totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1

  return {
    data:       data ?? [],
    page,
    setPage,
    totalCount,
    totalPages,
    isLoading,
  }
}
