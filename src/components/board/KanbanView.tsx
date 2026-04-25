import { useState } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useBoardStore } from '../../lib/store'
import { updateTask } from '../../lib/supabase'
import { STATUS_CONFIG } from '../cells/StatusCell'
import { KanbanCard } from './KanbanCard'
import type { Task } from '../../types/db'
import { Plus } from 'lucide-react'

type StatusKey = keyof typeof STATUS_CONFIG
const COLUMNS: StatusKey[] = ['todo', 'in_progress', 'done', 'stuck', 'waiting']

export function KanbanView() {
  const { tasks, upsertTask } = useBoardStore()
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  // Sadece ana görevler (parent_id = null)
  const rootTasks = tasks.filter((t) => t.parent_id === null)

  function tasksByStatus(status: string) {
    return rootTasks.filter((t) => t.status === status)
  }

  function onDragStart(e: DragStartEvent) {
    setActiveTask(tasks.find((t) => t.id === e.active.id) ?? null)
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveTask(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const task = tasks.find((t) => t.id === active.id)
    if (!task) return

    // over.id bir sütun id'si (status adı) veya başka kart id'si
    const newStatus = COLUMNS.includes(over.id as StatusKey)
      ? (over.id as StatusKey)
      : tasks.find((t) => t.id === over.id)?.status

    if (!newStatus || newStatus === task.status) return

    upsertTask({ ...task, status: newStatus })
    await updateTask(task.id, { status: newStatus })
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 p-6 h-full overflow-x-auto items-start">
        {COLUMNS.map((col) => {
          const cfg = STATUS_CONFIG[col]
          const colTasks = tasksByStatus(col)

          return (
            <SortableContext
              key={col}
              id={col}
              items={colTasks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="flex flex-col w-64 flex-shrink-0">
                {/* Sütun başlığı */}
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cfg.bg }} />
                  <span className="text-[13px] font-bold text-gray-200">{cfg.label}</span>
                  <span
                    className="text-[11px] font-bold px-1.5 py-0.5 rounded-full text-white ml-auto"
                    style={{ background: cfg.bg + 'cc' }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                {/* Sürükle-bırak alan */}
                <div
                  id={col}
                  className="flex flex-col gap-2 min-h-[80px] p-2 rounded-xl bg-[#20263c] border-2 border-dashed border-transparent transition-colors"
                  style={{ '--drop-color': cfg.bg } as React.CSSProperties}
                >
                  {colTasks.map((task) => (
                    <KanbanCard key={task.id} task={task} />
                  ))}

                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-16 text-xs text-gray-400 italic">
                      Görev yok
                    </div>
                  )}
                </div>

                {/* + Ekle */}
                <button className="flex items-center gap-1.5 mt-2 px-2 py-1.5 text-xs text-gray-500 hover:text-white hover:bg-[#20263c] rounded-lg transition-colors w-full">
                  <Plus size={12} />
                  Görev ekle
                </button>
              </div>
            </SortableContext>
          )
        })}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="rotate-2 opacity-90">
            <KanbanCard task={activeTask} overlay />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
