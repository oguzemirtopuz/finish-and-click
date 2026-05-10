import { useState } from 'react'
import { Trash2, MessageSquare, ExternalLink, GripVertical } from 'lucide-react'
import type { Task } from '../../types/db'
import { updateTask, deleteTask, recalculateProgress } from '../../lib/supabase'
import { toast } from 'sonner'
import { useBoardStore } from '../../lib/store'
import { StatusCell } from '../cells/StatusCell'
import { PriorityCell } from '../cells/PriorityCell'
import { ProgressCell } from '../cells/ProgressCell'
import { ResponsibleCell } from '../cells/ResponsibleCell'
import { STRIPE_W, CHECKBOX_W, GRIP_W } from './columns'
import { DropdownPortal } from '../ui/DropdownPortal'
import { cn } from '../../lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  task: Task
  isLast: boolean
}

export function SubTaskRow({ task, isLast }: Props) {
  const { upsertTask, columns, setSelectedTaskId, commentCounts, workspaces, activeWorkspaceId, groups, tasks, setTasks } = useBoardStore()
  const hasNote = !!(task.notes && task.notes.trim()) || (commentCounts[task.id] ?? 0) > 0
  const [title, setTitle] = useState(task.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [isMoving, setIsMoving] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const otherWorkspaces = workspaces.filter(w => w.id !== activeWorkspaceId)
  const allGroups = groups

  async function handleMoveToGroup(targetGroupId: string) {
    if (!window.confirm('Alt görevi seçilen gruba taşımak istediğinize emin misiniz?')) return
    try {
      setIsMoving(true)
      const { moveTaskToGroup } = await import('../../lib/supabase')
      await moveTaskToGroup(task.id, targetGroupId)
      
      const updatedTasks = tasks.map(t => {
        if (t.id === task.id) return { ...t, group_id: targetGroupId, parent_id: null }
        return t
      })
      setTasks(updatedTasks)
      
      if (task.parent_id) {
        const { recalculateProgress } = await import('../../lib/supabase')
        await recalculateProgress(task.parent_id)
      }
      toast.success('Alt görev taşındı')
    } catch (err: any) {
      toast.error('Alt görev taşınırken hata: ' + err.message)
    } finally {
      setIsMoving(false)
    }
  }

  async function handleMoveToWorkspace(targetWsId: string) {
    const ws = workspaces.find(w => w.id === targetWsId)
    if (!window.confirm(`Alt görevi "${ws?.name}" alanına taşımak istediğinize emin misiniz?`)) return
    try {
      setIsMoving(true)
      const { moveTaskToWorkspace } = await import('../../lib/supabase')
      await moveTaskToWorkspace(task.id, targetWsId)
      
      setTasks(tasks.filter(t => t.id !== task.id))
      
      if (task.parent_id) {
        const { recalculateProgress } = await import('../../lib/supabase')
        await recalculateProgress(task.parent_id)
      }
      toast.success('Alt görev başka bir çalışma alanına taşındı')
    } catch (err: any) {
      toast.error('Alt görev taşınırken hata: ' + err.message)
    } finally {
      setIsMoving(false)
    }
  }

  async function handleMoveToParent(parentId: string) {
    if (!window.confirm('Alt görevi seçilen görevin altına taşımak istediğinize emin misiniz?')) return
    try {
      setIsMoving(true)
      const oldParentId = task.parent_id
      const { moveTaskToParent, recalculateProgress } = await import('../../lib/supabase')
      await moveTaskToParent(task.id, parentId)
      
      const parentTask = tasks.find(t => t.id === parentId)
      const updatedTasks = tasks.map(t => {
        if (t.id === task.id) return { ...t, parent_id: parentId, group_id: parentTask?.group_id ?? t.group_id }
        return t
      })
      setTasks(updatedTasks)
      
      if (oldParentId) await recalculateProgress(oldParentId)
      await recalculateProgress(parentId)
      toast.success('Alt görev başka bir göreve taşındı')
    } catch (err: any) {
      toast.error('Alt görev taşınırken hata: ' + err.message)
    } finally {
      setIsMoving(false)
    }
  }

  async function update<K extends keyof Task>(field: K, value: Task[K]) {
    const updated = { ...task, [field]: value }
    upsertTask(updated)
    await updateTask(task.id, { [field]: value } as Partial<Task>)

    if (field === 'status' && task.parent_id) {
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
    <div ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-stretch border-b border-[#1D1F2B] bg-[#0F111A] hover:bg-[#1D1F2B] transition-colors group/subtask relative">
        {/* Stripe */}
        <div style={{ width: STRIPE_W }} className="shrink-0 bg-transparent" />

        {/* Drag Handle */}
        <div 
          {...listeners}
          style={{ width: GRIP_W }}
          className="flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing text-gray-600 hover:text-blue-500 transition-colors group-hover/subtask:opacity-100 opacity-20"
        >
          <GripVertical size={14} />
        </div>

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
        <div className="flex items-center gap-2 shrink-0 px-4 py-3 border-r-[1px] border-solid border-gray-600 min-w-0 overflow-hidden" style={{ width: titleWidth }}>
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
            title="Alt Görevi Sil"
          >
            <Trash2 size={11} />
          </button>

          <DropdownPortal
            trigger={
              <button
                disabled={isMoving}
                className={cn(
                  "shrink-0 ml-1 text-gray-400 hover:text-blue-400 opacity-0 group-hover/subtask:opacity-100 transition-all",
                  isMoving && "animate-pulse"
                )}
                title="Başka Gruba/Alana Taşı"
              >
                <ExternalLink size={11} />
              </button>
            }
            width={220}
          >
            <div className="max-h-64 overflow-y-auto">
              <div className="p-2 border-b border-gray-100/10 bg-[#1A1F36]">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hangi Gruba Taşınsın?</span>
              </div>
              <div className="py-1">
                {allGroups.length === 0 && otherWorkspaces.length === 0 && (
                  <div className="px-3 py-2 text-[11px] text-gray-500 italic">Başka hedef bulunamadı.</div>
                )}
                {allGroups.map(g => (
                  <button
                    key={g.id}
                    onMouseDown={(e) => { e.preventDefault(); handleMoveToGroup(g.id) }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:bg-[#20263c] hover:text-white transition-colors text-left"
                  >
                    <span className="truncate pr-2">↳ {g.name}</span>
                  </button>
                ))}

                {/* Root Görevler (Parent olabilecekler) */}
                <div className="px-2 py-1 mt-1 border-t border-gray-100/10 bg-[#1A1F36]">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hangi Görevin Altına?</span>
                </div>
                {groups.map(g => {
                  const groupTasks = tasks.filter(t => t.group_id === g.id && !t.parent_id)
                  if (groupTasks.length === 0) return null
                  return (
                    <div key={g.id}>
                      <div className="px-3 py-1 text-[9px] text-gray-500 font-medium bg-black/20 uppercase tracking-tight">{g.name}</div>
                      {groupTasks.map(gt => (
                        <button
                          key={gt.id}
                          disabled={gt.id === task.parent_id}
                          onMouseDown={(e) => { e.preventDefault(); handleMoveToParent(gt.id) }}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-1.5 text-[11px] transition-colors text-left",
                            gt.id === task.parent_id 
                              ? "text-blue-400 bg-blue-500/5 cursor-default" 
                              : "text-gray-300 hover:bg-[#20263c] hover:text-white"
                          )}
                        >
                          <span className="truncate">→ {gt.title}</span>
                          {gt.id === task.parent_id && <span className="text-[8px] bg-blue-500/20 px-1 rounded">Mevcut</span>}
                        </button>
                      ))}
                    </div>
                  )
                })}

                {otherWorkspaces.length > 0 && (
                  <>
                    <div className="px-2 py-1 mt-1 border-t border-gray-100/10 bg-[#1A1F36]">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Diğer Alanlar</span>
                    </div>
                    {otherWorkspaces.map(ws => (
                      <button
                        key={ws.id}
                        onMouseDown={(e) => { e.preventDefault(); handleMoveToWorkspace(ws.id) }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:bg-[#20263c] hover:text-white transition-colors text-left"
                      >
                        <span className="truncate pr-2">{ws.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100/10 text-gray-400 font-medium shrink-0">
                          {ws.type === 'personal' ? 'Kişisel' : 'Ortak'}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </DropdownPortal>
        </div>

        {columns.filter((c) => c.visible && c.id !== 'title').map((col) => {
          let content = null
          if (col.id === 'status') content = <StatusCell value={task.status} onChange={(v) => update('status', v as Task['status'])} />
          if (col.id === 'priority') content = <PriorityCell value={task.priority} onChange={(v) => update('priority', v as Task['priority'])} />
          if (col.id === 'progress') content = <ProgressCell value={task.progress} />
          if (col.id === 'assignee') content = <ResponsibleCell value={task.assigned_to} onChange={(v) => update('assigned_to', v)} />
          if (col.id === 'notes') content = (
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
          )

          return (
            <div
              key={col.id}
              style={{ width: col.width }}
              className={cn(
                "shrink-0 flex items-stretch border-r-[1px] border-solid border-gray-600",
                (col.id === 'status' || col.id === 'priority') ? "p-0" : "px-2 py-2"
              )}
            >
              <div className="w-full h-full flex items-center justify-center">
                {content}
              </div>
            </div>
          )
        })}

        {/* Sağ simetri barı */}
        <div style={{ width: STRIPE_W }} className="shrink-0 bg-transparent" />
      </div>
    </div>
  )
}
