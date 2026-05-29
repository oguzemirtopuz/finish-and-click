import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
import type { Task, TaskGroup } from '../../types/db'
import { useBoardStore } from '../../lib/store'
import { insertTask, updateGroup, deleteGroup, moveGroupToWorkspace } from '../../lib/supabase'
import { DropdownPortal } from '../ui/DropdownPortal'
import { TaskRow } from './TaskRow'
import { SummaryRow } from './SummaryRow'
import { STRIPE_W, CHECKBOX_W, GRIP_W } from './columns'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface Props {
  group: TaskGroup
  tasks: Task[]
  allTasks: Task[]
}

export function GroupRow({ group, tasks, allTasks }: Props) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState(group.name)
  const [isMoving, setIsMoving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const { setNodeRef, isOver } = useDroppable({
    id: group.id,
  })

  const { workspaces, activeWorkspaceId, setActiveWorkspace, columns, collapsedGroups, toggleCollapse, updateColumnWidth } = useBoardStore()

  const collapsed = collapsedGroups.has(group.id)
  const otherWorkspaces = workspaces.filter(w => w.id !== activeWorkspaceId)

  const rootTasks = tasks.filter((t) => t.parent_id === null).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const visibleCols = columns.filter((c) => c.visible)

  // Resizer state
  const [resizingCol, setResizingCol] = useState<string | null>(null)

  function onResizeStart(e: React.MouseEvent, colId: string, currentWidth: number) {
    e.preventDefault()
    e.stopPropagation()
    setResizingCol(colId)

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - e.clientX
      const newWidth = Math.max(50, currentWidth + delta)
      updateColumnWidth(colId, newWidth)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      setResizingCol(null)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  function getSubtasks(parentId: string) {
    return allTasks.filter((t) => t.parent_id === parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }

  async function addTask() {
    if (!newTitle.trim()) { setAdding(false); return }
    try {
      const t = await insertTask({
        group_id: group.id, parent_id: null,
        title: newTitle.trim(),
        status: 'todo', priority: 'medium',
        assigned_to: null, start_date: null, end_date: null,
        rating: null, numeric_value: null, progress: 0,
        order: rootTasks.length,
      })
      useBoardStore.getState().upsertTask(t)
      setNewTitle('')
      setAdding(false)
      toast.success('Task added')
    } catch (err: any) {
      toast.error(err.message || 'Error adding task')
    }
  }

  async function handleRename() {
    if (!tempName.trim() || tempName === group.name) {
      setIsEditingName(false)
      setTempName(group.name)
      return
    }
    await updateGroup(group.id, { name: tempName.trim() })
    setIsEditingName(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete group "${group.name}" and all its tasks?`)) return
    try {
      await deleteGroup(group.id)
      toast.success('Group deleted successfully')
    } catch (err: any) {
      toast.error('Error deleting group: ' + err.message)
    }
  }

  async function handleMove(targetId: string) {
    const target = workspaces.find(w => w.id === targetId)
    if (!target) return

    if (!window.confirm(`Are you sure you want to move group "${group.name}" to workspace "${target.name}"?`)) return

    try {
      setIsMoving(true)
      await moveGroupToWorkspace(group.id, targetId)

      const store = useBoardStore.getState()
      store.setGroups(store.groups.filter(g => g.id !== group.id))

      if (window.confirm(`Group moved! Do you want to go to workspace "${target.name}"?`)) {
        setActiveWorkspace(targetId)
      }
      toast.success('Group moved successfully')
    } catch (err: any) {
      console.error("Move group failed:", err)
      toast.error(err.message || "Error moving group.")
    } finally {
      setIsMoving(false)
    }
  }

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "mb-8 group/outer transition-colors rounded-lg p-1",
        isOver && "bg-blue-500/10 ring-2 ring-blue-500/50"
      )}
    >
      {/* Group header */}
      <div className="flex items-center gap-2 mb-2 px-1 group overflow-hidden">
        <button
          onClick={() => toggleCollapse(group.id)}
          className="p-1 rounded-md hover:bg-[#20263c] transition-colors shrink-0"
        >
          {collapsed
            ? <ChevronRight size={18} className="text-[#0073ea]" />
            : <ChevronDown size={18} className="text-[#0073ea]" />
          }
        </button>
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: group.color }} />

        {isEditingName ? (
          <input
            autoFocus
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            maxLength={255}
            className="font-bold text-white text-[13px] outline-none border-b border-blue-500 bg-transparent px-1 min-w-0"
          />
        ) : (
          <div className="flex items-center gap-2 group/title min-w-0">
            <span
              onDoubleClick={() => setIsEditingName(true)}
              className="font-bold text-white text-[13px] hover:text-blue-400 cursor-text block whitespace-nowrap"
            >
              {group.name}
            </span>
            <button
              onClick={() => setIsEditingName(true)}
              className="opacity-0 group-hover/title:opacity-100 transition-opacity text-gray-400 hover:text-blue-500 shrink-0"
            >
              <Pencil size={11} />
            </button>
          </div>
        )}

        <button
          onClick={handleDelete}
          className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          title="Delete Group"
        >
          <Trash2 size={13} />
        </button>

        {/* Move Button */}
        <DropdownPortal
          trigger={
            <button
              disabled={isMoving}
              className={cn(
                "ml-1 p-1 text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-[#20263c] shrink-0",
                isMoving && "animate-pulse"
              )}
              title="Move to another workspace"
            >
              <ExternalLink size={13} />
            </button>
          }
          width={220}
        >
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Move to which workspace?</span>
          </div>
          <div className="py-1">
            {otherWorkspaces.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-400 italic">No other workspaces found.</div>
            ) : (
              otherWorkspaces.map(ws => (
                <button
                  key={ws.id}
                  onMouseDown={(e) => { e.preventDefault(); handleMove(ws.id) }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                >
                  <span className="truncate pr-2">{ws.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">
                    {ws.type === 'personal' ? 'Personal' : 'Shared'}
                  </span>
                </button>
              ))
            )}
          </div>
        </DropdownPortal>

        <span
          className="text-[11px] sm:text-xs text-[#808191] whitespace-nowrap shrink-0 ml-auto"
        >
          {rootTasks.length} items
        </span>
      </div>

      {!collapsed && (
        <div className="w-fit inline-flex flex-col rounded-md ring-1 ring-[#1D1F2B] overflow-visible shadow-[0_4px_20px_rgba(0,0,0,0.2)] bg-[#0F111A] mb-2">

          {/* Column headers */}
          <div
            className="flex items-stretch text-[11px] font-bold text-[#808191] uppercase tracking-wider
                       border-b border-[#1D1F2B] bg-[#1D1F2B] rounded-t-md select-none group/header hover:bg-[#242636] transition-colors
                       sticky top-0 z-30 shadow-sm"
          >
            {/* Left colored stripe — same approach as rows */}
            <div style={{ width: STRIPE_W, background: group.color }} className="shrink-0 self-stretch rounded-tl-md" />
            <div style={{ width: GRIP_W }} className="shrink-0" />
            <div style={{ width: CHECKBOX_W }} className="shrink-0" />
            {visibleCols.map((col) => (
              <div
                key={col.id}
                style={{ width: col.width }}
                className={cn(
                  'shrink-0 py-3 flex items-center gap-1 border-r-[1px] border-solid border-gray-600 px-4 group/resizer relative',
                  col.id === 'title' ? 'justify-start text-left' : 'justify-center text-center font-bold'
                )}
              >
                {col.label}
                
                {/* Column Resizer */}
                <div
                  onMouseDown={(e) => onResizeStart(e, col.id, col.width)}
                  className="absolute right-[-12px] top-0 w-[24px] h-full cursor-col-resize z-20 group/handle flex justify-center"
                >
                  <div className={cn(
                    "w-[4px] h-full transition-colors",
                    resizingCol === col.id ? "bg-blue-500" : "bg-transparent group-hover/handle:bg-blue-500/50"
                  )} />
                </div>
              </div>
            ))}
            {/* Right symmetry bar */}
            <div style={{ width: STRIPE_W }} className="shrink-0 bg-transparent border-b border-[#1D1F2B]" />
          </div>

          <SortableContext items={rootTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {/* Task rows */}
            {rootTasks.length === 0 && (
              <div className="py-8 text-center text-xs text-gray-400">
                No tasks in this group yet
              </div>
            )}
            {rootTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                subtasks={getSubtasks(task.id)}
                groupColor={group.color}
                columns={columns}
              />
            ))}
          </SortableContext>

          {/* Summary row */}
          <SummaryRow tasks={tasks} columns={columns} groupColor={group.color} />

          {/* + Add task */}
          <div className="border-t border-[#1D1F2B] rounded-b-md overflow-hidden bg-[#0F111A] flex items-stretch">
            {/* Left colored stripe — same width as rows/header */}
            <div style={{ width: STRIPE_W, background: `${group.color}30` }} className="shrink-0 self-stretch" />
            <div style={{ width: GRIP_W }} className="shrink-0" />
            {/* Checkbox spacer — for alignment */}
            <div style={{ width: CHECKBOX_W }} className="shrink-0" />
            
            {adding ? (
              <div className="flex items-center gap-2 flex-1 px-4 py-2.5 bg-[#1D1F2B]">
                <input
                  autoFocus value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTask()
                    if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
                  }}
                  onBlur={addTask}
                  maxLength={255}
                  placeholder="Task name..."
                  className="flex-1 text-sm outline-none border-b-2 border-blue-500 py-0.5 bg-transparent placeholder:text-[#808191] text-white"
                />
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 flex-1 px-4 py-4 text-sm text-[#808191] hover:text-white hover:bg-[#1D1F2B] transition-colors"
              >
                <Plus size={14} />
                + Add Item
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
