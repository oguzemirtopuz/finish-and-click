import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'
import { Calendar } from 'lucide-react'

interface Props {
  startDate: string | null
  endDate: string | null
  onChange: (start: string | null, end: string | null) => void
}

function fmt(d: string | null) {
  if (!d) return ''
  try { return format(parseISO(d), 'd MMM', { locale: tr }) } catch { return d }
}

export function TimelineCell({ startDate, endDate, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [localStart, setLocalStart] = useState(startDate ?? '')
  const [localEnd, setLocalEnd] = useState(endDate ?? '')

  if (!editing) {
    const label = startDate && endDate
      ? `${fmt(startDate)} → ${fmt(endDate)}`
      : startDate ? fmt(startDate)
      : '—'

    return (
      <button
        onClick={() => setEditing(true)}
        className="flex items-center justify-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors w-full px-1"
      >
        <Calendar size={12} className="flex-shrink-0" />
        <span className="truncate">{label}</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={localStart}
        onChange={(e) => setLocalStart(e.target.value)}
        className="text-xs border border-blue-300 rounded px-1 py-0.5 w-[100px] outline-none"
      />
      <span className="text-gray-400 text-xs">→</span>
      <input
        type="date"
        value={localEnd}
        onChange={(e) => setLocalEnd(e.target.value)}
        className="text-xs border border-blue-300 rounded px-1 py-0.5 w-[100px] outline-none"
      />
      <button
        onClick={() => { onChange(localStart || null, localEnd || null); setEditing(false) }}
        className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
      >
        ✓
      </button>
    </div>
  )
}
