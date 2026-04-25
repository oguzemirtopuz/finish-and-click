import { createClient } from '@supabase/supabase-js'
import type { Workspace, TaskGroup, Task, ActivityLog, TaskComment, Profile } from '../types/db'

// ============================================================
// Supabase İstemcisi
// ============================================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================================
// Veri Çekme Fonksiyonları
// ============================================================

/** Tüm workspace'leri getir */
export async function fetchWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Çalışma alanını güncelle */
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

/** Çalışma alanını sil */
export async function deleteWorkspace(id: string): Promise<void> {
  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Yeni çalışma alanı ekle */
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

/** Workspace'e ait tüm grupları getir */
export async function fetchGroups(workspaceId: string): Promise<TaskGroup[]> {
  const { data, error } = await supabase
    .from('task_groups')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('order', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Grubu sil */
export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase
    .from('task_groups')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Grubu güncelle */
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

/** Workspace'e ait tüm görevleri getir (alt görevler dahil) */
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

/** Tek bir görevi güncelle */
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

/** Görevi sil */
export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
  if (error) throw error
}

/** Yeni görev ekle */
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

/** Yeni grup ekle */
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

/** Activity log kaydı ekle */
export async function logActivity(
  entry: Omit<ActivityLog, 'id' | 'created_at'>
): Promise<void> {
  await supabase.from('activity_log').insert(entry)
}

/** 
 * Kişisel bir alan için karşılık gelen Ortak alanı bulur veya oluşturur.
 * İsim şablonu: "[Kişisel Alan Adı] - Ortak"
 */
export async function ensureSharedWorkspace(personalWsId: string, userId: string): Promise<Workspace> {
  const { data: personalWs } = await supabase.from('workspaces').select('name').eq('id', personalWsId).single()
  const targetName = `${personalWs?.name || 'Kişisel'} - Ortak`

  // Önce bu isimde ve tipte bir alan var mı bak
  const { data: existing } = await supabase
    .from('workspaces')
    .select('*')
    .eq('name', targetName)
    .eq('type', 'shared')
    .maybeSingle()

  if (existing) return existing as Workspace

  // Yoksa oluştur
  const { data: newWs, error } = await supabase
    .from('workspaces')
    .insert({ name: targetName, type: 'shared', owner_id: userId })
    .select()
    .single()

  if (error) throw error
  return newWs as Workspace
}

/** Görevi (ve gerekiyorsa grubunu) başka bir workspace'e taşır */
export async function moveTaskToWorkspace(taskId: string, targetWsId: string): Promise<void> {
  // 1. Görevin şu anki bilgilerini al
  const { data: task, error: tErr } = await supabase
    .from('tasks')
    .select('*, task_groups(name)')
    .eq('id', taskId)
    .single()

  if (tErr || !task) throw tErr || new Error('Task not found')

  const groupName = (task.task_groups as any).name

  // 2. Hedef workspace'de aynı isimde grup var mı bak
  let { data: targetGroup } = await supabase
    .from('task_groups')
    .select('id')
    .eq('workspace_id', targetWsId)
    .eq('name', groupName)
    .maybeSingle()

  // 3. Yoksa hedefte yeni grup oluştur
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

  // 4. Görevi ve tüm alt görevlerini hedef gruba taşı (or condition isn't ideal for update with single eq)
  if (!targetGroup) throw new Error('Hedef grup oluşturulamadı')

  // Ana görev
  const { error: moveErr } = await supabase
    .from('tasks')
    .update({ group_id: targetGroup.id })
    .eq('id', taskId)

  if (moveErr) throw moveErr

  // Alt görevler
  await supabase
    .from('tasks')
    .update({ group_id: targetGroup.id })
    .eq('parent_id', taskId)

  // 5. Log kaydı
  await logActivity({
    task_id: taskId,
    user_id: null,
    field: 'workspace_migration',
    old_value: 'personal',
    new_value: 'shared'
  })
}


/** Ana görevin progress'ini alt görevlere göre yeniden hesapla */
export async function recalculateProgress(parentId: string): Promise<void> {
  // Önce parent'ın kendi durumunu kontrol et
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

/** Workspace üyelerini (Profil + Manuel Kişiler) getir */
export async function fetchWorkspaceMembers(workspaceId: string): Promise<Profile[]> {
  // 1. Gerçek profilleri çek (workspace_members üzerinden)
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

  // 2. Manuel eklenen kişileri çek (workspace_contacts tablosundan)
  const { data: contacts, error: contactErr } = await supabase
    .from('workspace_contacts')
    .select('id, full_name, email')
    .eq('workspace_id', workspaceId)

  if (contactErr) {
    // Tablo henüz yoksa hata vermesin, boş dönsün
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

/** Manuel sorumlu ekle
 * 
 * DB Requirement (Supabase'de bir kez çalıştır):
 * ─────────────────────────────────────────────
 * CREATE TABLE IF NOT EXISTS workspace_contacts (
 *   id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 *   full_name TEXT NOT NULL,
 *   email     TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * -- Eğer tasks.assigned_to FK kısıtlaması varsa kaldır:
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

/** Grubu tüm görevleriyle birlikte başka bir workspace'e taşı */
export async function moveGroupToWorkspace(groupId: string, targetWsId: string) {
  // 1. Hedef workspace tipini bul (shared ise assignee 'Ortak' olacak)
  const { data: ws } = await supabase
    .from('workspaces')
    .select('type')
    .eq('id', targetWsId)
    .single()

  // 2. Grubu güncelle
  const { error: groupErr } = await supabase
    .from('task_groups')
    .update({ workspace_id: targetWsId })
    .eq('id', groupId)

  if (groupErr) throw groupErr

  // 3. Eğer hedef shared ise, o gruptaki TÜM görevlerin assignee'sini 'Ortak' yap (bir kereye mahsus)
  if (ws?.type === 'shared') {
    const { error: taskErr } = await supabase
      .from('tasks')
      .update({ assigned_to: null })
      .eq('group_id', groupId)

    if (taskErr) console.error("Task update error during move:", taskErr)
  }
}

// ============================================================
// Yorumlar (Comments) & Görseller
// ============================================================

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
