import { DropdownPortal } from '../ui/DropdownPortal'

type StatusKey = 'todo' | 'in_progress' | 'test' | 'done' | 'stuck' | 'waiting'

export const STATUS_CONFIG: Record<StatusKey, { label: string; bg: string }> = {
  todo:        { label: 'Yapılacak',    bg: '#c4c4c4' },
  in_progress: { label: 'Çalışılıyor',  bg: '#fdab3d' },
  test:        { label: 'Test',         bg: '#f39c12' },
  done:        { label: 'Tamamlandı',   bg: '#00c875' },
  stuck:       { label: 'Takıldı',      bg: '#df2f4a' },
  waiting:     { label: 'Bekliyor',     bg: '#a25ddc' },
}

const ORDER: StatusKey[] = ['todo', 'in_progress', 'test', 'done', 'stuck', 'waiting']

interface Props {
  value: string
  onChange: (val: string) => void
}

export function StatusCell({ value, onChange }: Props) {
  const key = (value as StatusKey) in STATUS_CONFIG ? (value as StatusKey) : 'todo'
  const cfg = STATUS_CONFIG[key]

  const trigger = (
    <div
      className="flex items-center justify-center text-[13px] w-full max-w-[130px] py-1.5 rounded-md text-white font-medium select-none cursor-pointer hover:brightness-110 transition-all shadow-sm"
      style={{ background: cfg.bg }}
    >
      {cfg.label}
    </div>
  )

  return (
    <DropdownPortal trigger={trigger} width={172}>
      <div className="px-2 pb-1 pt-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1 mb-1">Durum Seç</p>
      </div>
      {ORDER.map((s) => {
        const c = STATUS_CONFIG[s]
        const active = s === key
        return (
          <button
            key={s}
            onMouseDown={(e) => { e.preventDefault(); onChange(s) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#20263c] transition-colors rounded"
          >
            <span
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ background: c.bg }}
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
