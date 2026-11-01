import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useNavigate, type LinkProps } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import { bnNum } from '@/lib/text'
import type { Paginated } from '@/lib/types'
import { cn } from '@/lib/utils'

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string }

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

/** A row checkbox; clicks stay off the row, which would open it. */
export function SelectBox({ checked, indeterminate, onChange, label }: { checked: boolean; indeterminate?: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked
      }}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => e.stopPropagation()}
      className="size-4 cursor-pointer accent-primary align-middle"
    />
  )
}

/** The rows picked for a bulk change; kept across pages and searches until cleared. */
export function useSelection() {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set())
  const toggle = (ids: number[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (on) next.add(id)
        else next.delete(id)
      }
      return next
    })
  return { selected, ids: [...selected], toggle, clear: () => setSelected(new Set()) }
}

/** The strip that shows while rows are picked: how many, what can be done to them, and a way to let go. */
export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: ReactNode }) {
  if (!count) return null
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-primary/5 px-3 py-2">
      <span className="text-sm font-medium">{bnNum(count)}টি নির্বাচিত</span>
      <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="নির্বাচন বাতিল" title="নির্বাচন বাতিল">
        <X />
      </Button>
      <div className="ms-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

/**
 * Server-paginated admin table: search box, optional filter controls, clickable rows
 * and a per-row actions cell. `filters` are sent as query params.
 * With `bulkActions`, rows get checkboxes and the actions show in a bar while any are picked.
 */
export function DataTable<T extends { id: number }>({
  path,
  queryKey,
  columns,
  filters = {},
  filterControls,
  rowLink,
  actions,
  searchPlaceholder = 'খুঁজুন…',
  empty = 'কিছু পাওয়া যায়নি',
  perPage = 25,
  bulkActions,
}: {
  path: string
  queryKey: string
  columns: Column<T>[]
  filters?: Record<string, string | undefined>
  filterControls?: ReactNode
  rowLink?: (row: T) => LinkProps
  actions?: (row: T) => ReactNode
  searchPlaceholder?: string
  empty?: ReactNode
  perPage?: number
  bulkActions?: (ids: number[], clear: () => void) => ReactNode
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const q = useDebounced(search.trim())
  // Back to page 1 whenever the search or filters change
  const resetKey = JSON.stringify([q, filters])
  const [paging, setPaging] = useState({ resetKey, page: 1 })
  const page = paging.resetKey === resetKey ? paging.page : 1
  const setPage = (next: number) => setPaging({ resetKey, page: next })

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin', queryKey, 'table', { q, page, filters }],
    queryFn: () => api<Paginated<T>>(path, { query: { ...filters, q, page, per_page: perPage } }),
    placeholderData: keepPreviousData,
  })
  const meta = data?.meta
  const colSpan = columns.length + (actions ? 1 : 0) + (bulkActions ? 1 : 0)
  const selection = useSelection()
  const pageIds = data?.data.map((row) => row.id) ?? []
  const pagePicked = pageIds.filter((id) => selection.selected.has(id)).length

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} className="ps-8" />
        </div>
        {filterControls}
        {meta && <span className="ms-auto text-xs text-muted-foreground">মোট {bnNum(meta.total)}টি</span>}
      </div>

      {bulkActions && (
        <BulkBar count={selection.selected.size} onClear={selection.clear}>
          {bulkActions(selection.ids, selection.clear)}
        </BulkBar>
      )}

      <Table className={cn(isFetching && !isLoading && 'opacity-60 transition-opacity')}>
        <TableHeader>
          <TableRow>
            {bulkActions && (
              <TableHead className="w-0">
                <SelectBox label="এই পৃষ্ঠার সব" checked={!!pageIds.length && pagePicked === pageIds.length} indeterminate={pagePicked > 0} onChange={(on) => selection.toggle(pageIds, on)} />
              </TableHead>
            )}
            {columns.map((column) => (
              <TableHead key={column.header} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            {actions && <TableHead className="w-0" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }, (_, i) => (
              <TableRow key={i}>
                <TableCell colSpan={colSpan}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ))}
          {data?.data.map((row) => (
            <TableRow key={row.id} data-state={selection.selected.has(row.id) ? 'selected' : undefined} className={cn(rowLink && 'cursor-pointer')} onClick={rowLink ? () => navigate(rowLink(row)) : undefined}>
              {bulkActions && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <SelectBox label="নির্বাচন" checked={selection.selected.has(row.id)} onChange={(on) => selection.toggle([row.id], on)} />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.header} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
              {actions && (
                <TableCell onClick={(e) => e.stopPropagation()} className="text-end">
                  <div className="flex justify-end gap-1">{actions(row)}</div>
                </TableCell>
              )}
            </TableRow>
          ))}
          {data && !data.data.length && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-10 text-center text-sm text-muted-foreground">
                {empty}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {meta && meta.last_page > 1 && (
        <div className="flex items-center justify-end gap-2 border-t p-3 text-sm">
          <span className="text-muted-foreground">
            পৃষ্ঠা {bnNum(meta.current_page)} / {bnNum(meta.last_page)}
          </span>
          <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="আগের পৃষ্ঠা">
            <ChevronLeft className="rtl:rotate-180" />
          </Button>
          <Button variant="outline" size="icon-sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)} aria-label="পরের পৃষ্ঠা">
            <ChevronRight className="rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  )
}
