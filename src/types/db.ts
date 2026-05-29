// ============================================================
// Database Type Definitions — Mirrors Supabase tables
// ============================================================

export type TaskStatus =
  | 'todo'
  | 'in_progress'
  | 'done'
  | 'stuck'
  | 'waiting'
  | 'test'

export interface Workspace {
  id: string
  name: string
  type: 'personal' | 'shared'
  owner_id: string | null
  created_at: string
}

export interface TaskGroup {
  id: string
  workspace_id: string
  name: string
  color: string
  order: number
  collapsed: boolean
  created_at: string
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  group_id: string
  parent_id: string | null
  title: string
  status: TaskStatus
  priority: TaskPriority       // required column
  assigned_to: string | null
  start_date: string | null
  end_date: string | null
  rating: number | null
  numeric_value: number | null
  progress: number
  order: number
  notes?: string | null
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
}

export interface ActivityLog {
  id: string
  task_id: string
  user_id: string | null
  field: string
  old_value: string | null
  new_value: string | null
  created_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string | null
  parent_id: string | null
  content: string
  image_url: string | null
  created_at: string
  user_email?: string // joined property for UI
}

// Enriched types for in-app use
export interface TaskWithSubtasks extends Task {
  subtasks: Task[]
}

export interface TaskGroupWithTasks extends TaskGroup {
  tasks: TaskWithSubtasks[]
  collapsed: boolean
}
