import type { Task } from '../../types/db'
import type { ColumnDef } from '../../lib/store'
import { STRIPE_W, CHECKBOX_W } from './columns'
import { STATUS_CONFIG } from '../cells/StatusCell'

interface Props {
  tasks: Task[]
  columns: ColumnDef[]
  groupColor: string
}

export function SummaryRow({ tasks, columns, groupColor }: Props) {
  const root = tasks.filter((t) => t.parent_id === null)
  if (root.length === 0) return null

  const totalBudget = root.reduce((s, t) => s + (t.numeric_value ?? 0), 0)
  const avgProgress = root.length ? Math.round(root.reduce((s, t) => s + t.progress, 0) / root.length) : 0
  const avgRating = root.filter((t) => t.rating).length
    ? Math.round(root.reduce((s, t) => s + (t.rating ?? 0), 0) / root.filter((t) => t.rating).length * 10) / 10
    : null

  // Status dağılımı
  const statusMap: Record<string, number> = {}
  root.forEach((t) => { statusMap[t.status] = (statusMap[t.status] ?? 0) + 1 })

  const visibleCols = columns.filter((c) => c.visible)

  return (
    <div
      className="flex items-stretch border-t border-[#1D1F2B] bg-[#0F111A] text-[11px] text-[#808191] font-medium rounded-b-md"
    >
      {/* Sol renkli şerit — header/row ile aynı */}
      <div style={{ width: STRIPE_W, background: `${groupColor}40` }} className="shrink-0 self-stretch" />
      {/* Checkbox placeholder */}
      <div style={{ width: CHECKBOX_W }} className="shrink-0" />

      {visibleCols.map((col) => {
        let content: React.ReactNode = null

        if (col.id === 'title') {
          content = (
            <span className="text-[#808191] font-semibold w-full pr-4">
              {root.length} items
            </span>
          )
        } else if (col.id === 'status') {
          const total = root.length
          content = (
            <div className="flex h-8 w-full rounded-md overflow-hidden bg-[#20263c] shadow-inner">
              {Object.entries(statusMap).map(([s, cnt]) => {
                const cfg = STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]
                const width = (cnt / total) * 100
                return cfg && cnt > 0 ? (
                  <div
                    key={s}
                    className="h-full flex items-center justify-center text-[10px] text-white font-bold transition-all hover:brightness-110 relative group/stat"
                    style={{
                      width: `${width}%`,
                      background: cfg.bg,
                    }}
                  >
                    {width > 20 ? cnt : ''}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white rounded text-[10px] opacity-0 group-hover/stat:opacity-100 pointer-events-none whitespace-nowrap z-50">
                      {cfg.label}: {cnt} ({Math.round(width)}%)
                    </div>
                  </div>
                ) : null
              })}
            </div>
          )
        } else if (col.id === 'progress') {
          content = (
            <div className="flex items-center gap-1.5 w-full">
              <div className="w-16 h-1.5 bg-[#20263c] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${avgProgress}%`,
                    background: avgProgress === 100 ? '#00c875' : '#0073ea',
                  }}
                />
              </div>
              <span>{avgProgress}%</span>
            </div>
          )
        } else if (col.id === 'budget') {
          content = (
            <span className="font-semibold text-gray-300 w-full">
              {totalBudget > 0
                ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(totalBudget)
                : '—'}
            </span>
          )
        } else if (col.id === 'rating') {
          content = (
            <span className="w-full">
              {avgRating != null ? `⭐ ${avgRating}` : '—'}
            </span>
          )
        } else {
          content = <div className="w-full" />
        }

        return (
          <div
            key={col.id}
            className="shrink-0 px-4 py-2 flex items-center border-r border-white/10"
            style={{ width: col.width }}
          >
            {content}
          </div>
        )
      })}

      {/* Sağ simetri barı */}
      <div style={{ width: STRIPE_W }} className="shrink-0 bg-transparent" />
    </div>
  )
}
