import { createClient } from '@supabase/supabase-js'
import type { Workspace, TaskGroup, Task, ActivityLog, TaskComment, Profile } from '../types/db'

// ============================================================
// Supabase Client
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================================
// Data Fetching Functions
// ============================================================

/** Fetch all workspaces */
export async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Update a workspace */
export async function updateWorkspace(
  id: string,
  updates: Partial<Omit<Workspace, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

/** Delete a workspace */
export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Insert a new workspace */
export async function insertWorkspace(name: string, owner_id: string): Promise<Workspace> {
  const { data, error } = await supabase
    .from('workspaces')
    .insert({ name, type: 'personal', owner_id })
    .select()
    .single()
  if (error) {
    throw error
  }
  return data as Workspace
}

/** Fetch all groups belonging to a workspace */
export async function fetchGroups(workspaceId: string): Promise<TaskGroup[]> {
  const { data, error } = await supabase
    .from('task_groups')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Delete a group */
export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_groups')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Update a group */
export async function updateGroup(
  id: string,
  updates: Partial<Omit<TaskGroup, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('task_groups')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

/** Fetch all tasks belonging to a workspace (including subtasks) */
export async function fetchTasks(workspaceId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      task_groups!inner(workspace_id)
    `)
    .eq('task_groups.workspace_id', workspaceId)
    .order('order', { ascending: true })
  if (error) throw error
  return (data ?? []) as Task[]
}

/** Update a single task */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'created_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
  if (error) throw error
}

/** Delete a task */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Insert a new task */
export async function insertTask(
  task: Omit<Task, 'id' | 'created_at'>
): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

/** Insert a new group */
export async function insertGroup(
  group: Omit<TaskGroup, 'id' | 'created_at'>
): Promise<TaskGroup> {
  const { data, error } = await supabase
    .from('task_groups')
    .insert(group)
    .select()
    .single()
  if (error) {
    throw error
  }
  return data as TaskGroup
}

/** Insert an activity log entry */
export async function logActivity(
  entry: Omit<ActivityLog, 'id' | 'created_at'>
): Promise<void> {
  await supabase.from('activity_log').insert(entry)
}

/**
 * Finds or creates the corresponding Shared workspace for a Personal workspace.
 * Name template: "[Personal Workspace Name] - Shared"
 */
export async function ensureSharedWorkspace(personalWsId: string, userId: string): Promise<Workspace> {
  const { data: personalWs } = await supabase.from('workspaces').select('name').eq('id', personalWsId).single()
  const targetName = `${personalWs?.name || 'Personal'} - Shared`

  // Check if a workspace with this name and type already exists
  const { data: existing } = await supabase
    .from('workspaces')
    .select('*')
    .eq('name', targetName)
    .eq('type', 'shared')
    .maybeSingle()

  if (existing) return existing as Workspace

  // If not found, create a new one
  const { data: newWs, error } = await supabase
    .from('workspaces')
    .insert({ name: targetName, type: 'shared', owner_id: userId })
    .select()
    .single()

  if (error) throw error
  return newWs as Workspace
}

/** Moves a task (and its group if necessary) to another workspace */
export async function moveTaskToWorkspace(taskId: string, targetWsId: string): Promise<void> {
  // 1. Retrieve the current task details
  const { data: task, error: tErr } = await supabase
    .from('tasks')
    .select('*, task_groups(name)')
    .eq('id', taskId)
    .single()

  if (tErr || !task) throw tErr || new Error('Task not found')

  const groupName = (task.task_groups as any).name

  // 2. Check if a group with the same name exists in the target workspace
  let { data: targetGroup } = await supabase
    .from('task_groups')
    .select('id')
    .eq('workspace_id', targetWsId)
    .eq('name', groupName)
    .maybeSingle()

  // 3. If not, create a new group in the target workspace
  if (!targetGroup) {
    const { data: newGroup, error: gErr } = await supabase
      .from('task_groups')
      .insert({
        workspace_id: targetWsId,
        name: groupName,
        color: '#00c875',
        order: 0
      })
      .select()
      .single()
    if (gErr) throw gErr
    targetGroup = newGroup
  }

  // 4. Move the task and all its subtasks to the target group
  if (!targetGroup) throw new Error('Target group could not be created')

  // Main task (if it was a subtask, it becomes a root task)
  const { error: moveErr } = await supabase
    .from('tasks')
    .update({ group_id: targetGroup.id, parent_id: null })
    .eq('id', taskId)

  if (moveErr) throw moveErr

  // Subtasks
  await supabase
    .from('tasks')
    .update({ group_id: targetGroup.id })
    .eq('parent_id', taskId)

  // 5. Log the activity
  await logActivity({
    task_id: taskId,
    user_id: null,
    field: 'workspace_migration',
    old_value: 'personal',
    new_value: 'shared'
  })
}

/** Moves a task (and its subtasks) to the same or a different group. If it is a subtask, it becomes a root task. */
export async function moveTaskToGroup(taskId: string, targetGroupId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ group_id: targetGroupId, parent_id: null })
    .eq('id', taskId)

  if (error) throw error

  // Also move any subtasks to the new group
  await supabase
    .from('tasks')
    .update({ group_id: targetGroupId })
    .eq('parent_id', taskId)
}

/** Moves a task as a subtask under another parent task. */
export async function moveTaskToParent(taskId: string, parentId: string): Promise<void> {
  // First find the parent task's group so the task is moved to the correct group
  const { data: parent } = await supabase
    .from('tasks')
    .select('group_id')
    .eq('id', parentId)
    .single()

  if (!parent) throw new Error('Target parent task not found')

  const { error } = await supabase
    .from('tasks')
    .update({ 
      parent_id: parentId, 
      group_id: parent.group_id 
    })
    .eq('id', taskId)

  if (error) throw error

  // Also move any subtasks to the new group
  await supabase
    .from('tasks')
    .update({ group_id: parent.group_id })
    .eq('parent_id', taskId)
}

/** Updates the order and position of multiple tasks */
export async function updateTasksOrder(updates: { id: string, order: number, group_id?: string, parent_id?: string | null }[]): Promise<void> {
  // Supabase upsert performs a merge if we only provide id and the fields to change, 
  // but it's safer to use individual updates or a single call if we know the schema.
  // We'll use a loop for now to ensure we don't accidentally wipe other fields.
  const promises = updates.map(u => {
    const { id, ...fields } = u
    return supabase.from('tasks').update(fields).eq('id', id)
  })
  
  const results = await Promise.all(promises)
  const firstError = results.find(r => r.error)?.error
  if (firstError) throw firstError
}


/** Recalculates the progress of a parent task based on its subtasks */
export async function recalculateProgress(parentId: string): Promise<void> {
  // First check the parent task's own status
  const { data: parentTask } = await supabase.from('tasks').select('status, progress').eq('id', parentId).single()

  if (parentTask?.status === 'done') {
    if (parentTask.progress !== 100) {
      await supabase.from('tasks').update({ progress: 100 }).eq('id', parentId)
    }
    return
  }

  const { data: subtasks, error } = await supabase
    .from('tasks')
    .select('status')
    .eq('parent_id', parentId)

  if (error) return

  const count = subtasks?.length || 0
  const done = subtasks?.filter((t) => t.status === 'done').length || 0
  const progress = count > 0 ? Math.round((done / count) * 100) : 0

  if (parentTask && parentTask.progress !== progress) {
    await supabase.from('tasks').update({ progress }).eq('id', parentId)
  }
}

/** Fetch workspace members (Profiles + manually added contacts) */
export async function fetchWorkspaceMembers(workspaceId: string): Promise<Profile[]> {
  // 1. Fetch real profiles (via workspace_members)
  const { data: members, error: memberErr } = await supabase
    .from('workspace_members')
    .select(`
      profiles (
        id,
        email,
        full_name
      )
    `)
    .eq('workspace_id', workspaceId)

  if (memberErr) console.error("Member fetch error:", memberErr)

  // 2. Fetch manually added contacts (from workspace_contacts table)
  const { data: contacts, error: contactErr } = await supabase
    .from('workspace_contacts')
    .select('id, full_name, email')
    .eq('workspace_id', workspaceId)

  if (contactErr) {
    // If the table doesn't exist yet, fail silently and return empty
    console.warn("Contacts fetch error (table might not exist yet):", contactErr.message)
  }

  const profileList = (members as any[])?.map(m => m.profiles).filter(Boolean) || []
  const contactList = (contacts || []).map(c => ({
    id: c.id,
    email: c.email || `${c.full_name.toLowerCase().replace(/\s+/g, '.')}@manual.local`,
    full_name: c.full_name
  }))

  return [...profileList, ...contactList]
}

/** Add a manual assignee contact
 *
 * DB Requirement (run once in Supabase):
 * ─────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS workspace_contacts (
 *   id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 *   full_name TEXT NOT NULL,
 *   email     TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * -- If a FK constraint exists on tasks.assigned_to, remove it:
 * ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
 */
export async function insertWorkspaceContact(workspaceId: string, fullName: string): Promise<Profile> {
  const email = `${fullName.toLowerCase().replace(/\s+/g, '.')}@manual.local`

  const { data, error } = await supabase
    .from('workspace_contacts')
    .insert({
      workspace_id: workspaceId,
      full_name: fullName,
      email
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    email: data.email ?? email,
    full_name: data.full_name
  }
}

/** Move a group along with all its tasks to another workspace */
export async function moveGroupToWorkspace(groupId: string, targetWsId: string) {
  // 1. Get the target workspace type (if shared, assignee will be reset)
  const { data: ws } = await supabase
    .from('workspaces')
    .select('type')
    .eq('id', targetWsId)
    .single()

  // 2. Update the group
  const { error: groupErr } = await supabase
    .from('task_groups')
    .update({ workspace_id: targetWsId })
    .eq('id', groupId)

  if (groupErr) throw groupErr

  // 3. If the target is shared, reset the assignee for all tasks in the group
  if (ws?.type === 'shared') {
    const { error: taskErr } = await supabase
      .from('tasks')
      .update({ assigned_to: null })
      .eq('group_id', groupId)

    if (taskErr) console.error("Task update error during move:", taskErr)
  }
}

// ============================================================
// Comments & Attachments
// ============================================================

export async function fetchWorkspaceCommentCounts(workspaceId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      task_groups!inner(workspace_id),
      task_comments(count)
    `)
    .eq('task_groups.workspace_id', workspaceId)

  if (error) {
    console.error("fetchWorkspaceCommentCounts error:", error)
    return {}
  }

  const counts: Record<string, number> = {}
  data?.forEach((row: any) => {
    let count = 0
    if (row.task_comments) {
      if (Array.isArray(row.task_comments)) {
        count = row.task_comments[0]?.count || 0
      } else {
        count = row.task_comments.count || 0
      }
    }
    counts[row.id] = count
  })

  return counts
}

export async function fetchTaskComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from('task_comments')
    .select(`
      *,
      profiles ( email )
    `)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error("Comments fetch error:", error)
    return []
  }

  return (data as any[]).map(c => ({
    ...c,
    user_email: c.profiles?.email
  })) as TaskComment[]
}

export async function insertTaskComment(comment: Omit<TaskComment, 'id' | 'created_at' | 'user_email'>): Promise<TaskComment> {
  const { data, error } = await supabase
    .from('task_comments')
    .insert(comment)
    .select(`
      *,
      profiles ( email )
    `)
    .single()

  if (error) throw error
  return {
    ...data,
    user_email: data.profiles?.email
  } as TaskComment
}

export async function uploadCommentImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
  const filePath = `comment-images/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('task-attachments')
    .upload(filePath, file)

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage
    .from('task-attachments')
    .getPublicUrl(filePath)

  return data.publicUrl
}

export async function deleteTaskComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)

  if (error) throw error
}

export async function deleteAllTaskComments(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('task_id', taskId)

  if (error) throw error
}

export async function markSubtasksDone(parentId: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'done', progress: 100 })
    .eq('parent_id', parentId)

  if (error) throw error
}
