import { useState, useMemo } from 'react'
import { useBoardStore } from '../../lib/store'
import { GroupRow } from './GroupRow'
import { KanbanView } from './KanbanView'
import { Toolbar } from './Toolbar'
import { ViewTabs } from './ViewTabs'
import { TaskDetailSidebar } from './TaskDetailSidebar'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStart,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { updateTasksOrder, recalculateProgress } from '../../lib/supabase'
import { toast } from 'sonner'

export function BoardView() {
  const { groups, tasks, setTasks, viewMode, sortColumn, sortDirection } = useBoardStore()
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const filteredTasks = useMemo(() => {
    let result = [...tasks]
    
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }

    // Sort logic (only if not dragging, or we might want to disable sort during drag)
    if (sortColumn && !activeId) {
      result.sort((a, b) => {
        let valA: any = (a as any)[sortColumn]
        let valB: any = (b as any)[sortColumn]
        
        if (valA === valB) return 0
        if (valA === null || valA === undefined) return 1
        if (valB === null || valB === undefined) return -1
        
        const res = valA < valB ? -1 : 1
        return sortDirection === 'asc' ? res : -res
      })
    } else {
      // Default order by 'order' field
      result.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    }

    return result
  }, [tasks, search, sortColumn, sortDirection, activeId])

  function tasksForGroup(groupId: string) {
    return filteredTasks.filter((t) => t.group_id === groupId)
  }

  const handleDragStart = (event: DragStart) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const activeTask = tasks.find(t => t.id === activeId)
    if (!activeTask) return

    // Find destination
    let overTask = tasks.find(t => t.id === overId)
    let overGroup = groups.find(g => g.id === overId)

    let newGroupId = activeTask.group_id
    let newParentId = activeTask.parent_id

    if (overGroup) {
      newGroupId = overGroup.id
      newParentId = null
    } else if (overTask) {
      newGroupId = overTask.group_id
      // If dropping onto a task, should it become a subtask or just move next to it?
      // Usually, dropping onto an item in a list means reordering.
      // But if it's a different level, we might want to change parent.
      newParentId = overTask.parent_id
    }

    const oldTasks = [...tasks]
    
    // Simple reorder logic for now
    const itemsInSameContext = tasks.filter(t => 
      t.group_id === newGroupId && t.parent_id === newParentId
    ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    const activeIndex = itemsInSameContext.findIndex(t => t.id === activeId)
    let overIndex = itemsInSameContext.findIndex(t => t.id === overId)

    if (overIndex === -1 && overGroup) overIndex = itemsInSameContext.length

    // Update local state immediately for responsiveness
    const updatedTasks = tasks.map(t => {
      if (t.id === activeId) {
        return { ...t, group_id: newGroupId, parent_id: newParentId }
      }
      return t
    })

    // Re-calculate orders
    const finalItems = itemsInSameContext.filter(t => t.id !== activeId)
    if (overIndex !== -1) {
      finalItems.splice(overIndex, 0, { ...activeTask, group_id: newGroupId, parent_id: newParentId })
    } else {
      finalItems.push({ ...activeTask, group_id: newGroupId, parent_id: newParentId })
    }

    const tasksWithNewOrder = updatedTasks.map(t => {
      const idx = finalItems.findIndex(fi => fi.id === t.id)
      if (idx !== -1) {
        return { ...t, order: idx }
      }
      return t
    })

    setTasks(tasksWithNewOrder)

    try {
      const updates = finalItems.map((t, idx) => ({
        id: t.id,
        order: idx,
        group_id: newGroupId,
        parent_id: newParentId
      }))
      await updateTasksOrder(updates)
      
      // If moved to/from a parent, recalculate progress
      if (activeTask.parent_id) await recalculateProgress(activeTask.parent_id)
      if (newParentId) await recalculateProgress(newParentId)
      
    } catch (err: any) {
      setTasks(oldTasks)
      toast.error('Sıralama güncellenirken hata oluştu')
    }
  }

  const empty = groups.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#181b34' }}>
      <ViewTabs />
      <Toolbar search={search} onSearch={setSearch} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={{ flex: 1, overflow: 'auto' }}>
          {empty ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 256, color: '#6b7280' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
              <p style={{ fontSize: 16, fontWeight: 500, color: '#d1d5db', marginBottom: 4 }}>Henüz grup yok</p>
              <p style={{ fontSize: 14, marginBottom: 12 }}>Toolbar'dan "New Group" ekle</p>
            </div>
          ) : viewMode === 'kanban' ? (
            <KanbanView />
          ) : (
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, width: 'fit-content', minWidth: 'min-content' }}>
              {groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  tasks={tasksForGroup(group.id)}
                  allTasks={filteredTasks}
                />
              ))}
            </div>
          )}
        </div>
        <DragOverlay>
          {activeId ? (
            <div className="bg-[#1D1F2B] p-4 rounded shadow-xl border border-blue-500 opacity-80 text-white text-sm">
              {tasks.find(t => t.id === activeId)?.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <TaskDetailSidebar />
    </div>
  )
}
