import { DropdownPortal } from '../ui/DropdownPortal'

type PriorityKey = 'low' | 'medium' | 'high' | 'critical'

const PRIORITY_CONFIG: Record<PriorityKey, { label: string; color: string; bg: string }> = {
  low:      { label: 'Düşük',    color: '#ffffff', bg: '#579bfc' },
  medium:   { label: 'Orta',     color: '#ffffff', bg: '#a25ddc' },
  high:     { label: 'Yüksek',   color: '#ffffff', bg: '#401694' },
  critical: { label: 'Kritik',   color: '#ffffff', bg: '#333333' },
}

const ORDER: PriorityKey[] = ['low', 'medium', 'high', 'critical']

interface Props {
  value: string | null
  onChange: (val: string) => void
}

export function PriorityCell({ value, onChange }: Props) {
  const key = (value as PriorityKey) in PRIORITY_CONFIG ? (value as PriorityKey) : 'medium'
  const cfg = PRIORITY_CONFIG[key]

  const trigger = (
    <div
      className="flex items-center justify-center text-[13px] font-bold w-full h-full text-white cursor-pointer hover:brightness-110 transition-all border-l border-white/20"
      style={{ background: cfg.bg }}
    >
      {cfg.label}
    </div>
  )

  return (
    <DropdownPortal trigger={trigger} width={152}>
      <div className="px-2 pb-1 pt-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1 mb-1">Öncelik Seç</p>
      </div>
      {ORDER.map((p) => {
        const c = PRIORITY_CONFIG[p]
        const active = p === key
        return (
          <button
            key={p}
            onMouseDown={(e) => { e.preventDefault(); onChange(p) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#20263c] transition-colors rounded"
          >
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ background: c.color }}
            />
            <span className={`flex-1 text-left font-medium ${active ? 'text-white' : 'text-gray-400'}`}>
              {c.label}
            </span>
            {active && <span className="text-blue-500 text-[10px]">✓</span>}
          </button>
        )
      })}
    </DropdownPortal>
  )
}
