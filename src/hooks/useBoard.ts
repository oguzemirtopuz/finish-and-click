import { useEffect } from 'react'
import { supabase, fetchWorkspaces, fetchGroups, fetchTasks, insertWorkspace, fetchWorkspaceMembers } from '../lib/supabase'
import { useBoardStore } from '../lib/store'
import type { Task } from '../types/db'
import { toast } from 'sonner'

export function useBoard() {
  const {
    activeWorkspaceId,
    setWorkspaces,
    setActiveWorkspace,
    setGroups,
    setTasks,
    upsertTask,
    setMembers,
  } = useBoardStore()

  // İlk yüklemede workspace listesini çek
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      fetchWorkspaces().then(async (ws) => {
        const store = useBoardStore.getState()
        if (ws.length === 0) {
          const newWs = await insertWorkspace('Kişisel Çalışma Alanım', user.id)
          setWorkspaces([newWs])
          setActiveWorkspace(newWs.id)
        } else {
          setWorkspaces(ws)
          // Eğer seçili alan yoksa veya artık geçerli değilse ilkini seç
          const currentValid = ws.some(w => w.id === store.activeWorkspaceId)
          if (!store.activeWorkspaceId || !currentValid) {
            setActiveWorkspace(ws[0].id)
          }
        }
      }).catch(err => {
        console.error("Workspace fetch error:", err)
        toast.error("Çalışma alanları yüklenirken hata oluştu: " + err.message)
      })
    })
  }, [])

  // Aktif workspace değiştiğinde grup, görev ve üyeleri yükle
  useEffect(() => {
    if (!activeWorkspaceId) return
    
    Promise.all([
      fetchGroups(activeWorkspaceId),
      fetchTasks(activeWorkspaceId),
      fetchWorkspaceMembers(activeWorkspaceId),
    ]).then(([groups, tasks, members]) => {
      setGroups(groups)
      setTasks(tasks)
      setMembers(members)
    })
  }, [activeWorkspaceId])

  // ── Realtime ─────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('board-realtime', { config: { broadcast: { self: false } } })

      // Görev değişiklikleri
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          const store = useBoardStore.getState()
          const currentGroups = store.groups.map(g => g.id)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const incoming = payload.new as Task
            
            // Eğer task artık bu workspace'e ait değilse (veya başından beri değilse) store'dan kaldır
            if (!currentGroups.includes(incoming.group_id)) {
              if (store.tasks.some(t => t.id === incoming.id)) {
                store.setTasks(store.tasks.filter(t => t.id !== incoming.id))
              }
              return
            }

            upsertTask(incoming)

            upsertTask(incoming)

            // Calculate progress for ALL tasks locally
            const storeTasks = useBoardStore.getState().tasks
            const tasksByParent = new Map<string | null, Task[]>()
            storeTasks.forEach(t => {
              const arr = tasksByParent.get(t.parent_id) || []
              arr.push(t)
              tasksByParent.set(t.parent_id, arr)
            })

            const newTasks = storeTasks.map(t => {
              const children = tasksByParent.get(t.id) || []
              let newProgress = t.progress
              
              if (t.status === 'done') {
                newProgress = 100
              } else if (children.length === 0) {
                newProgress = 0
              } else {
                const doneChildren = children.filter(c => c.status === 'done').length
                newProgress = Math.round((doneChildren / children.length) * 100)
              }

              if (newProgress !== t.progress) {
                return { ...t, progress: newProgress }
              }
              return t
            })

            // Update store tasks if there are progress changes
            const hasChanges = newTasks.some((t, i) => t.progress !== storeTasks[i].progress)
            if (hasChanges) {
              store.setTasks(newTasks)
            }

          } else if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as any).id
            const store = useBoardStore.getState()
            const remaining = store.tasks.filter(t => t.id !== oldId)
            
            // Calculate progress for ALL tasks locally after deletion
            const tasksByParent = new Map<string | null, Task[]>()
            remaining.forEach(t => {
              const arr = tasksByParent.get(t.parent_id) || []
              arr.push(t)
              tasksByParent.set(t.parent_id, arr)
            })

            const newTasks = remaining.map(t => {
              const children = tasksByParent.get(t.id) || []
              let newProgress = t.progress
              
              if (t.status === 'done') {
                newProgress = 100
              } else if (children.length === 0) {
                newProgress = 0
              } else {
                const doneChildren = children.filter(c => c.status === 'done').length
                newProgress = Math.round((doneChildren / children.length) * 100)
              }

              if (newProgress !== t.progress) {
                return { ...t, progress: newProgress }
              }
              return t
            })

            store.setTasks(newTasks)
          }
        }
      )
      // Grubu da dinleyelim
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_groups' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const incoming = payload.new as any
            const store = useBoardStore.getState()
            const exists = store.groups.find(g => g.id === incoming.id)
            if (exists) {
              store.setGroups(store.groups.map(g => g.id === incoming.id ? incoming : g))
            } else {
              store.setGroups([...store.groups, incoming])
            }
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id
            const store = useBoardStore.getState()
            store.setGroups(store.groups.filter(g => g.id !== oldId))
          }
        }
      )

      // Workspace değişikliklerini de dinleyelim
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspaces' },
        (payload) => {
          const store = useBoardStore.getState()
          if (payload.eventType === 'UPDATE') {
            const incoming = payload.new as any
            store.setWorkspaces(store.workspaces.map(w => w.id === incoming.id ? incoming : w))
          } else if (payload.eventType === 'INSERT') {
            const incoming = payload.new as any
            const exists = store.workspaces.find(w => w.id === incoming.id)
            if (!exists) store.setWorkspaces([...store.workspaces, incoming])
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id
            const remaining = store.workspaces.filter(w => w.id !== oldId)
            store.setWorkspaces(remaining)
            if (store.activeWorkspaceId === oldId && remaining.length > 0) {
              store.setActiveWorkspace(remaining[0].id)
            }
          }
        }
      )
      
      // Üyelik değişikliklerini dinleyelim (Yeni davet gelirse veya başkası katılırsa)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'workspace_members' },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return
          
          const incoming = payload.new as any
          const old = payload.old as any
          const currentWsId = useBoardStore.getState().activeWorkspaceId
          
          // Eğer BANA bir üyelik geldiyse veya benden gittiyse -> Workspace listesini yenile
          if (incoming?.user_id === user.id || old?.user_id === user.id) {
            fetchWorkspaces().then(ws => useBoardStore.getState().setWorkspaces(ws))
          }
          
          // Eğer AKTİF workspace üyeleri değiştiyse (başkası katıldıysa) -> Üyeleri yenile
          if (incoming?.workspace_id === currentWsId || old?.workspace_id === currentWsId) {
            fetchWorkspaceMembers(currentWsId!).then(m => useBoardStore.getState().setMembers(m))
          }
        }
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('🔴 Realtime bağlandı')
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [])
}
