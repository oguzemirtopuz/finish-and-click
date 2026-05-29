import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Task, TaskGroup, Workspace, Profile } from '../types/db'

export type ViewMode = 'table' | 'kanban'

export interface ColumnDef {
  id: string
  label: string
  width: number
  visible: boolean
  fixed?: boolean   // cannot be deleted or hidden
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'title',         label: 'Task Name',   width: 400, visible: true,  fixed: true },
  { id: 'status',        label: 'Status',      width: 180, visible: true,  fixed: true },
  { id: 'assignee',      label: 'Assignee',    width: 140, visible: true  },
  { id: 'timeline',      label: 'Timeline',    width: 250, visible: true  },
  { id: 'priority',      label: 'Priority',    width: 160, visible: true  },
  { id: 'progress',      label: 'Progress',    width: 180, visible: false },
  { id: 'rating',        label: 'Rating',      width: 130, visible: false },
  { id: 'budget',        label: 'Budget',      width: 120, visible: false },
  { id: 'notes',         label: 'Notes',       width: 200, visible: false },
]

interface BoardStore {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  groups: TaskGroup[]
  tasks: Task[]
  collapsedGroups: Set<string>
  viewMode: ViewMode
  columns: ColumnDef[]
  sortColumn: string | null
  sortDirection: 'asc' | 'desc'
  members: Profile[]
  selectedTaskId: string | null
  commentCounts: Record<string, number>

  setWorkspaces: (ws: Workspace[]) => void
  setActiveWorkspace: (id: string) => void
  setGroups: (groups: TaskGroup[]) => void
  setTasks: (tasks: Task[]) => void
  setMembers: (m: Profile[]) => void
  upsertTask: (task: Task) => void
  toggleCollapse: (groupId: string) => void
  setViewMode: (v: ViewMode) => void
  toggleColumn: (id: string) => void
  updateColumnWidth: (id: string, width: number) => void
  setSorting: (col: string | null, dir: 'asc' | 'desc') => void
  setSelectedTaskId: (id: string | null) => void
  setCommentCount: (taskId: string, count: number) => void
  setCommentCounts: (counts: Record<string, number>) => void
}

export const useBoardStore = create<BoardStore>()(
  persist(
    (set) => ({
      workspaces: [],
      activeWorkspaceId: null,
      groups: [],
      tasks: [],
      collapsedGroups: new Set(),
      viewMode: 'table',
      columns: DEFAULT_COLUMNS,
      sortColumn: null,
      sortDirection: 'asc',
      members: [],
      selectedTaskId: null,
      commentCounts: {},

      setWorkspaces: (workspaces) => set({ workspaces }),
      setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
      setGroups: (groups) => set({ groups }),
      setTasks: (tasks) => set({ tasks }),
      setMembers: (members) => set({ members }),
      setSorting: (sortColumn, sortDirection) => set({ sortColumn, sortDirection }),
      setSelectedTaskId: (id) => set({ selectedTaskId: id }),
      setCommentCount: (taskId, count) =>
        set((state) => ({ commentCounts: { ...state.commentCounts, [taskId]: count } })),
      setCommentCounts: (counts) => set({ commentCounts: counts }),

      upsertTask: (task) =>
        set((state) => {
          const idx = state.tasks.findIndex((t) => t.id === task.id)
          if (idx === -1) return { tasks: [...state.tasks, task] }
          const updated = [...state.tasks]
          updated[idx] = task
          return { tasks: updated }
        }),

      toggleCollapse: (groupId) =>
        set((state) => {
          const next = new Set(state.collapsedGroups)
          next.has(groupId) ? next.delete(groupId) : next.add(groupId)
          return { collapsedGroups: next }
        }),

      setViewMode: (viewMode) => set({ viewMode }),

      toggleColumn: (id) =>
        set((state) => ({
          columns: state.columns.map((c) =>
            c.id === id && !c.fixed ? { ...c, visible: !c.visible } : c
          ),
        })),

      updateColumnWidth: (id, width) =>
        set((state) => ({
          columns: state.columns.map((c) => (c.id === id ? { ...c, width } : c)),
        })),
    }),
    {
      name: 'workos-board-v4',
      partialize: (s) => ({
        viewMode: s.viewMode,
        columns: s.columns,
        activeWorkspaceId: s.activeWorkspaceId,
      }),
      merge: (persisted: any, current) => {
        const storedCols: ColumnDef[] = persisted?.columns ?? []
        const mergedCols = DEFAULT_COLUMNS.map((def) => {
          const stored = storedCols.find((c) => c.id === def.id)
          return stored ? { ...def, visible: stored.visible, width: stored.width } : def
        })
        return {
          ...current,
          ...(persisted ?? {}),
          columns: mergedCols,
          viewMode: persisted?.viewMode ?? current.viewMode,
          activeWorkspaceId: persisted?.activeWorkspaceId ?? current.activeWorkspaceId,
        }
      },
    }
  )
)
