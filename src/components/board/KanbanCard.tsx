import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, Star, Trash2 } from 'lucide-react'
import { useBoardStore } from '../../lib/store'
import { cn } from '../../lib/utils'
import type { Task, Profile } from '../../types/db'
import { STATUS_CONFIG } from '../cells/StatusCell'
import { deleteTask } from '../../lib/supabase'
import { format, parseISO } from 'date-fns'
import { tr } from 'date-fns/locale'

function fmt(d: string | null) {
  if (!d) return null
  try { return format(parseISO(d), 'd MMM', { locale: tr }) } catch { return null }
}

interface Props {
  task: Task
  overlay?: boolean
}

export function KanbanCard({ task, overlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const statusCfg = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.todo
  const start = fmt(task.start_date)
  const end   = fmt(task.end_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-[#1A1F36] rounded-xl border border-[#2C334A] p-3 shadow-sm cursor-grab active:cursor-grabbing select-none group/card',
        'hover:border-blue-500 transition-all',
        isDragging && 'opacity-30',
        overlay && 'shadow-2xl ring-2 ring-blue-400'
      )}
    >
      {/* Status şerit */}
      <div
        className="h-1 rounded-full mb-2.5 -mx-3 -mt-3 rounded-t-xl"
        style={{ background: statusCfg.bg }}
      />

      {/* Başlık + Sil */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p 
          className="text-[13px] font-semibold text-white leading-snug flex-1"
          {...attributes}
          {...listeners}
        >
          {task.title}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (window.confirm('Bu görevi silmek istediğinize emin misiniz?')) {
              deleteTask(task.id)
            }
          }}
          className="text-gray-300 hover:text-red-500 transition-colors shrink-0 p-1 opacity-0 group-hover/card:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Tarih */}
        {(start || end) && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Calendar size={10} />
            <span>{start}{end && start ? ` → ${end}` : end}</span>
          </div>
        )}

        {/* Progress */}
        {task.progress > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-12 h-1 bg-[#20263c] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${task.progress}%`,
                  background: task.progress === 100 ? '#00c875' : '#0073ea',
                }}
              />
            </div>
            <span className="text-[10px] text-gray-400">{task.progress}%</span>
          </div>
        )}
      </div>

      {/* Alt satır: Avatar + Rating */}
      <div className="flex items-center justify-between mt-2.5">
        {(() => {
          const profile = useBoardStore.getState().members.find((m: Profile) => m.id === task.assigned_to)
          if (!profile) return (
            <div className="w-6 h-6 rounded-full bg-[#20263c] border border-dashed border-gray-600 flex items-center justify-center text-[10px] text-gray-500">
              ?
            </div>
          )
          const displayName = profile.full_name || profile.email
          const color = (name: string) => {
            const COLORS = ['#0073ea','#00c875','#e2445c','#fdab3d','#a25ddc','#037f4c']
            let h = 0
            for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
            return COLORS[Math.abs(h) % COLORS.length]
          }
          return (
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-[#0F111A]"
              style={{ background: color(profile.email) }}
              title={displayName}
            >
              {displayName[0].toUpperCase()}
            </div>
          )
        })()}

        {task.rating != null && task.rating > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: task.rating }).map((_, i) => (
              <Star key={i} size={9} className="text-yellow-400 fill-yellow-400" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
