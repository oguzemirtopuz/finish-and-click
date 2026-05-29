import { DropdownPortal } from '../ui/DropdownPortal'

type StatusKey = 'todo' | 'in_progress' | 'test' | 'done' | 'stuck' | 'waiting'

export const STATUS_CONFIG: Record<StatusKey, { label: string; bg: string }> = {
  todo:        { label: 'To Do',    bg: '#c4c4c4' },
  in_progress: { label: 'In Progress',  bg: '#fdab3d' },
  test:        { label: 'Test',         bg: '#f39c12' },
  done:        { label: 'Done',   bg: '#00c875' },
  stuck:       { label: 'Stuck',      bg: '#df2f4a' },
  waiting:     { label: 'Waiting',     bg: '#a25ddc' },
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
      className="flex items-center justify-center text-[13px] w-full h-full text-white font-bold select-none cursor-pointer hover:brightness-110 transition-all border-l border-white/20"
      style={{ background: cfg.bg }}
    >
      {cfg.label}
    </div>
  )

  return (
    <DropdownPortal trigger={trigger} width={172} wrapperClassName="w-full h-full cursor-pointer">
      <div className="px-2 pb-1 pt-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1 mb-1">Select Status</p>
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
