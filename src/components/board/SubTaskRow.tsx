import { useState } from 'react'
import { Trash2, MessageSquare } from 'lucide-react'
import type { Task } from '../../types/db'
import { updateTask, deleteTask, recalculateProgress } from '../../lib/supabase'
import { toast } from 'sonner'
import { useBoardStore } from '../../lib/store'
import { StatusCell } from '../cells/StatusCell'
import { PriorityCell } from '../cells/PriorityCell'
import { ProgressCell } from '../cells/ProgressCell'
import { ResponsibleCell } from '../cells/ResponsibleCell'
import { STRIPE_W, CHECKBOX_W } from './columns'
import { cn } from '../../lib/utils'

interface Props {
  task: Task
  isLast: boolean
}

export function SubTaskRow({ task, isLast }: Props) {
  const { upsertTask, columns, setSelectedTaskId, commentCounts } = useBoardStore()
  const hasNote = !!(task.notes && task.notes.trim()) || (commentCounts[task.id] ?? 0) > 0
  const [title, setTitle] = useState(task.title)
  const [editingTitle, setEditingTitle] = useState(false)

  async function update<K extends keyof Task>(field: K, value: Task[K]) {
    const updated = { ...task, [field]: value }
    upsertTask(updated)
    await updateTask(task.id, { [field]: value } as Partial<Task>)

    if (field === 'status' && task.parent_id) {
      // Optimistic parent progress update
      const store = useBoardStore.getState()
      const siblings = store.tasks.filter(t => t.parent_id === task.parent_id)
      const merged = siblings.map(t => t.id === task.id ? updated : t)
      const done = merged.filter(t => t.status === 'done').length
      const progress = merged.length > 0 ? Math.round((done / merged.length) * 100) : 0
      const parent = store.tasks.find(t => t.id === task.parent_id)
      if (parent) upsertTask({ ...parent, progress })

      await recalculateProgress(task.parent_id)
    }
  }

  async function commitTitle() {
    setEditingTitle(false)
    if (title === task.title) return
    if (!title.trim()) { setTitle(task.title); return }
    upsertTask({ ...task, title })
    await updateTask(task.id, { title })
  }

  async function handleDelete() {
    if (!window.confirm('Bu alt görevi silmek istediğinize emin misiniz?')) return
    try {
      await deleteTask(task.id)
      if (task.parent_id) await recalculateProgress(task.parent_id)
      toast.success('Alt görev silindi')
    } catch (err: any) {
      toast.error('Alt görev silinirken hata oluştu: ' + err.message)
    }
  }

  const titleWidth = columns.find((c) => c.id === 'title')?.width ?? 300

  return (
    <div className="flex items-stretch border-b border-[#1D1F2B] bg-[#0F111A] hover:bg-[#1D1F2B] transition-colors group/subtask">
      {/* Stripe */}
      <div style={{ width: STRIPE_W }} className="shrink-0 bg-transparent" />

      {/* Sol bağlantı çizgisi + checkbox */}
      <div className="relative shrink-0" style={{ width: CHECKBOX_W }}>
        <div className="absolute left-[50%] top-0 w-px bg-[#1D1F2B]" style={{ height: isLast ? '50%' : '100%' }} />
        <div className="absolute left-[50%] top-[50%] h-px bg-[#1D1F2B]" style={{ width: '50%' }} />
        <div className="absolute inset-0 flex items-center justify-end pr-1">
          <input
            type="checkbox"
            className="accent-blue-600 cursor-pointer w-3 h-3"
            checked={task.status === 'done'}
            onChange={() => update('status', task.status === 'done' ? 'todo' : 'done')}
          />
        </div>
      </div>

      {/* Title */}
      <div className="flex items-center gap-2 shrink-0 px-4 py-3 border-r-[4px] border-[#0F111A]" style={{ width: titleWidth }}>
        {editingTitle ? (
          <input
            autoFocus value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
            maxLength={255}
            className="flex-1 text-xs outline-none bg-transparent border-b border-blue-400 py-0.5"
          />
        ) : (
          <span
            onDoubleClick={() => setEditingTitle(true)}
            onClick={() => setSelectedTaskId(task.id)}
            className="flex-1 text-xs text-gray-400 truncate cursor-pointer hover:text-blue-400 transition-colors group-hover/subtask:text-white"
            style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none' }}
          >
            {task.title}
          </span>
        )}
        <button
          onClick={handleDelete}
          className="shrink-0 text-gray-300 hover:text-red-500 opacity-0 group-hover/subtask:opacity-100 transition-all ml-auto"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* Dinamik hücreler */}
      {columns.filter((c) => c.visible && c.id !== 'title').map((col) => {
        if (col.id === 'status') return (
          <div key={col.id} className="flex w-full h-full items-stretch shrink-0 border-r-[1px] border-solid border-gray-600" style={{ width: col.width }}>
            <StatusCell value={task.status} onChange={(v) => update('status', v as Task['status'])} />
          </div>
        )
        if (col.id === 'priority') return (
          <div key={col.id} className="flex w-full h-full items-stretch shrink-0 border-r-[1px] border-solid border-gray-600" style={{ width: col.width }}>
            <PriorityCell value={task.priority} onChange={(v) => update('priority', v as Task['priority'])} />
          </div>
        )
        if (col.id === 'progress') return (
          <div key={col.id} className="flex items-center shrink-0 py-3 px-4 border-r-[1px] border-solid border-gray-600" style={{ width: col.width }}>
            <div className="w-full"><ProgressCell value={task.progress} /></div>
          </div>
        )
        if (col.id === 'assignee') return (
          <div key={col.id} className="flex items-center shrink-0 py-3 px-4 border-r-[1px] border-solid border-gray-600" style={{ width: col.width }}>
            <div className="w-full"><ResponsibleCell value={task.assigned_to} onChange={(v) => update('assigned_to', v)} /></div>
          </div>
        )
        if (col.id === 'notes') return (
          <div key={col.id} className="flex items-center justify-start shrink-0 py-3 px-4 border-r-[1px] border-solid border-gray-600" style={{ width: col.width }}>
            <button
              onClick={() => setSelectedTaskId(task.id)}
              className={cn(
                "p-1 rounded transition-colors",
                hasNote
                  ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
                  : "text-[#808191] hover:bg-[#252836] hover:text-blue-400"
              )}
            >
              <MessageSquare size={14} fill={hasNote ? "currentColor" : "none"} />
            </button>
          </div>
        )
        return <div key={col.id} style={{ width: col.width }} className="shrink-0 flex items-center px-4 py-3 border-r-[1px] border-solid border-gray-600" />
      })}

      {/* Sağ simetri barı */}
      <div style={{ width: STRIPE_W }} className="shrink-0 bg-transparent" />
    </div>
  )
}
