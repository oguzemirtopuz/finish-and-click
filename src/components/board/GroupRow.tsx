import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, ExternalLink } from 'lucide-react'
// Cache buster for Netlify deploy: 2026-04-27-v2
import type { Task, TaskGroup } from '../../types/db'
import { useBoardStore } from '../../lib/store'
import { insertTask, updateGroup, deleteGroup, moveGroupToWorkspace } from '../../lib/supabase'
import { DropdownPortal } from '../ui/DropdownPortal'
import { TaskRow } from './TaskRow'
import { SummaryRow } from './SummaryRow'
import { STRIPE_W, CHECKBOX_W } from './columns'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

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

  const { workspaces, activeWorkspaceId, setActiveWorkspace, columns, collapsedGroups, toggleCollapse } = useBoardStore()

  const collapsed = collapsedGroups.has(group.id)
  const otherWorkspaces = workspaces.filter(w => w.id !== activeWorkspaceId)

  const rootTasks = tasks.filter((t) => t.parent_id === null)
  const visibleCols = columns.filter((c) => c.visible)

  function getSubtasks(parentId: string) {
    return allTasks.filter((t) => t.parent_id === parentId)
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
      toast.success('Görev eklendi')
    } catch (err: any) {
      toast.error(err.message || 'Görev eklenirken bir hata oluştu')
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
    if (!window.confirm(`"${group.name}" grubunu ve içindeki tüm görevleri silmek istediğinize emin misiniz?`)) return
    try {
      await deleteGroup(group.id)
      toast.success('Grup başarıyla silindi')
    } catch (err: any) {
      toast.error('Grup silinirken hata oluştu: ' + err.message)
    }
  }

  async function handleMove(targetId: string) {
    const target = workspaces.find(w => w.id === targetId)
    if (!target) return

    if (!window.confirm(`"${group.name}" grubunu "${target.name}" alanına taşımak istediğinize emin misiniz?`)) return

    try {
      setIsMoving(true)
      await moveGroupToWorkspace(group.id, targetId)

      // Optimizasyon: Yerel store'dan hemen kaldır
      const store = useBoardStore.getState()
      store.setGroups(store.groups.filter(g => g.id !== group.id))

      // Kullanıcıya bilgi verip geçiş yapmak isteyip istemediğini soralım
      if (window.confirm(`Grup taşındı! "${target.name}" alanına gitmek ister misiniz?`)) {
        setActiveWorkspace(targetId)
      }
      toast.success('Grup başarıyla taşındı')
    } catch (err: any) {
      console.error("Move group failed:", err)
      toast.error(err.message || "Grup taşınırken bir hata oluştu.")
    } finally {
      setIsMoving(false)
    }
  }


  return (
    <div className="mb-8 group">
      {/* Grup başlığı */}
      <div className="flex items-center gap-2 mb-2 px-1 group">
        <button
          onClick={() => toggleCollapse(group.id)}
          className="p-1 rounded-md hover:bg-[#20263c] transition-colors"
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
            className="font-bold text-white text-[13px] outline-none border-b border-blue-500 bg-transparent px-1"
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditingName(true)}
            className="font-bold text-white text-[13px] hover:text-blue-400 cursor-text group/title flex items-center gap-2"
          >
            {group.name}
            <button
              onClick={() => setIsEditingName(true)}
              className="opacity-0 group-hover/title:opacity-100 transition-opacity text-gray-400 hover:text-blue-500"
            >
              <Pencil size={11} />
            </button>
          </span>
        )}

        <button
          onClick={handleDelete}
          className="ml-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Grubu Sil"
        >
          <Trash2 size={13} />
        </button>

        {/* Taşıma Butonu */}
        <DropdownPortal
          trigger={
            <button
              disabled={isMoving}
              className={cn(
                "ml-1 p-1 text-gray-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-[#20263c]",
                isMoving && "animate-pulse"
              )}
              title="Başka Alanına Taşı"
            >
              <ExternalLink size={13} />
            </button>
          }
          width={220}
        >
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hangi Alana Taşınsın?</span>
          </div>
          <div className="py-1">
            {otherWorkspaces.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-gray-400 italic">Başka çalışma alanı bulunamadı.</div>
            ) : (
              otherWorkspaces.map(ws => (
                <button
                  key={ws.id}
                  onMouseDown={(e) => { e.preventDefault(); handleMove(ws.id) }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                >
                  <span className="truncate pr-2">{ws.name}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 font-medium">
                    {ws.type === 'personal' ? 'Kişisel' : 'Ortak'}
                  </span>
                </button>
              ))
            )}
          </div>
        </DropdownPortal>

        <span
          className="text-xs text-[#808191]"
        >
          {rootTasks.length} items
        </span>
      </div>

      {!collapsed && (
        <div className="w-fit inline-flex flex-col rounded-md ring-1 ring-[#1D1F2B] overflow-visible shadow-[0_4px_20px_rgba(0,0,0,0.2)] bg-[#0F111A] mb-2">

          {/* Sütun başlıkları */}
          <div
            className="flex items-stretch text-[11px] font-bold text-[#808191] uppercase tracking-wider
                       border-b border-[#1D1F2B] bg-[#1D1F2B] rounded-t-md select-none group/header hover:bg-[#242636] transition-colors
                       sticky top-0 z-30 shadow-sm"
          >
            {/* Sol renkli şerit — rows ile aynı yaklaşım */}
            <div style={{ width: STRIPE_W, background: group.color }} className="shrink-0 self-stretch rounded-tl-md" />
            <div style={{ width: CHECKBOX_W }} className="shrink-0" />
            {visibleCols.map((col) => (
              <div
                key={col.id}
                style={{ width: col.width }}
                className={cn(
                  'shrink-0 py-3 flex items-center gap-1 border-r border-white/10',
                  (col.id === 'status' || col.id === 'priority') ? 'justify-center text-center px-1 font-bold' : 'px-4'
                )}
              >
                {col.label}
              </div>
            ))}
            {/* Sağ simetri barı */}
            <div style={{ width: STRIPE_W }} className="shrink-0 bg-transparent border-b border-[#1D1F2B]" />
          </div>

          {/* Görev satırları */}
          {rootTasks.length === 0 && (
            <div className="py-8 text-center text-xs text-gray-400">
              Bu grupta henüz görev yok
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

          {/* Özet satırı */}
          <SummaryRow tasks={tasks} columns={columns} groupColor={group.color} />

          {/* + Görev ekle */}
          <div className="border-t border-[#1D1F2B] rounded-b-md overflow-hidden bg-[#0F111A] flex items-stretch">
            {/* Sol renkli şerit — rows/header ile aynı genişlik */}
            <div style={{ width: STRIPE_W, background: `${group.color}30` }} className="shrink-0 self-stretch" />
            {/* Checkbox spacer — hizalama için */}
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
