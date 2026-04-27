import { useState, useMemo } from 'react'
import { useBoardStore } from '../../lib/store'
import { GroupRow } from './GroupRow'
import { KanbanView } from './KanbanView'
import { Toolbar } from './Toolbar'
import { ViewTabs } from './ViewTabs'
import { TaskDetailSidebar } from './TaskDetailSidebar'

export function BoardView() {
  const { groups, tasks, viewMode, sortColumn, sortDirection } = useBoardStore()
  const [search, setSearch] = useState('')

  const filteredTasks = useMemo(() => {
    let result = [...tasks]
    
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((t) => t.title.toLowerCase().includes(q))
    }

    // Sort logic
    if (sortColumn) {
      result.sort((a, b) => {
        let valA: any = (a as any)[sortColumn]
        let valB: any = (b as any)[sortColumn]
        
        if (sortColumn === 'status' || sortColumn === 'priority') {
          // Add custom logic if needed, otherwise string compare
        }
        
        if (valA === valB) return 0
        if (valA === null || valA === undefined) return 1
        if (valB === null || valB === undefined) return -1
        
        const res = valA < valB ? -1 : 1
        return sortDirection === 'asc' ? res : -res
      })
    }

    return result
  }, [tasks, search, sortColumn, sortDirection])

  function tasksForGroup(groupId: string) {
    return filteredTasks.filter((t) => t.group_id === groupId)
  }

  const empty = groups.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#181b34' }}>
      <ViewTabs />
      <Toolbar search={search} onSearch={setSearch} />

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
      <TaskDetailSidebar />
    </div>
  )
}
