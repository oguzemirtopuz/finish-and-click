import { useState } from 'react'

interface Props {
  value: number | null
  onChange: (v: number | null) => void
}

export function BudgetCell({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState(value?.toString() ?? '')

  function commit() {
    setEditing(false)
    const n = parseFloat(raw.replace(/[^0-9.-]/g, ''))
    onChange(isNaN(n) ? null : n)
  }

  const display = value != null
    ? new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(value)
    : '—'

  if (editing) {
    return (
      <input
        autoFocus
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        maxLength={15}
        className="w-full text-xs outline-none border-b border-blue-400 bg-transparent px-1 py-0.5"
        placeholder="0"
      />
    )
  }

  return (
    <span
      onDoubleClick={() => { setRaw(value?.toString() ?? ''); setEditing(true) }}
      className="text-xs text-gray-700 cursor-default px-1 font-medium hover:text-blue-600 transition-colors"
    >
      {display}
    </span>
  )
}
