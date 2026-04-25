interface Props {
  value: number   // 0–100
}

export function ProgressCell({ value }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))

  const color =
    pct === 100 ? '#00c875'
    : pct >= 60  ? '#fdab3d'
    : pct > 0    ? '#0073ea'
    :              '#e2e2e2'

  return (
    <div className="flex items-center gap-2 w-full px-1">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span
        className="text-[11px] font-semibold w-8 text-right flex-shrink-0"
        style={{ color: pct > 0 ? color : '#aaa' }}
      >
        {pct}%
      </span>
    </div>
  )
}
