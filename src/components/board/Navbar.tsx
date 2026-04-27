import { useState, useEffect } from 'react'
import { UserPlus, Plus, MoreHorizontal, LogOut, Pencil, Trash2 } from 'lucide-react'
import { DropdownPortal } from '../ui/DropdownPortal'
import { InviteModal } from './InviteModal'
import { supabase, updateWorkspace, deleteWorkspace } from '../../lib/supabase'
import { useBoardStore } from '../../lib/store'

export function Navbar() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useBoardStore()
  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || 'Bilinmiyor')
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function handleCreateWorkspace() {
    const name = window.prompt('Yeni çalışma alanının adını girin:')
    if (!name?.trim()) return
    const type = window.confirm('Bu bir ortak çalışma alanı mı olsun? (Tamam: Ortak, İptal: Kişisel)') ? 'shared' : 'personal'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), type, owner_id: user.id })
      .select()
      .single()

    if (error) { alert('Hata: ' + error.message); return }
    if (data) {
      const newWs = data as any
      const store = useBoardStore.getState()
      store.setWorkspaces([...store.workspaces, newWs])
      setActiveWorkspace(newWs.id)
    }
  }

  async function handleRenameWorkspace() {
    if (!activeWorkspace) return
    const newName = window.prompt('Yeni adı girin:', activeWorkspace.name)
    if (!newName?.trim() || newName === activeWorkspace.name) return
    try {
      await updateWorkspace(activeWorkspace.id, { name: newName.trim() })
      const store = useBoardStore.getState()
      store.setWorkspaces(store.workspaces.map(w => w.id === activeWorkspace.id ? { ...w, name: newName.trim() } : w))
    } catch (err: any) { alert('Hata: ' + err.message) }
  }

  async function handleDeleteWorkspace() {
    if (!activeWorkspace) return
    if (!window.confirm(`"${activeWorkspace.name}" çalışma alanını silmek istiyor musunuz?`)) return
    try {
      await deleteWorkspace(activeWorkspace.id)
      const store = useBoardStore.getState()
      const remaining = store.workspaces.filter(w => w.id !== activeWorkspace.id)
      store.setWorkspaces(remaining)
      if (remaining.length > 0) setActiveWorkspace(remaining[0].id)
    } catch (err: any) { alert('Hata: ' + err.message) }
  }

  return (
    <header className="shrink-0 bg-[#181b34] border-b border-[#3b4266] pt-4 px-6 pb-4 md:pt-6 md:pb-0">
      {/* Title row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 md:mb-6">
        <div className="flex items-center gap-4">
          {activeWorkspace ? (
            <>
              <h1 className="text-xl md:text-3xl font-bold text-white leading-tight whitespace-nowrap">{activeWorkspace.name}</h1>
              <DropdownPortal
                trigger={
                  <button className="flex items-center justify-center p-1 rounded hover:bg-white/10 text-[#a9abcd] cursor-pointer" >
                    <MoreHorizontal size={18} />
                  </button>
                }
                width={160}
              >
                <div style={{ padding: 4 }}>
                  <button onClick={handleRenameWorkspace} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Pencil size={13} /> Adını Değiştir
                  </button>
                  <button onClick={handleDeleteWorkspace} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 13, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Trash2 size={13} /> Sil
                  </button>
                </div>
              </DropdownPortal>
            </>
          ) : (
            <h1 className="text-xl md:text-3xl font-bold text-white whitespace-nowrap">New Custom Board</h1>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-x-4 ml-auto pb-2 md:pb-0">
          {activeWorkspace && (
            <button
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-transparent border border-[#3b4266] rounded cursor-pointer transition-colors hover:bg-[#323956]"
            >
              <UserPlus size={16} /> Invite
            </button>
          )}
          <button
            onClick={handleCreateWorkspace}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white bg-[#579bfc] hover:bg-[#3b82f6] border-none rounded cursor-pointer transition-colors whitespace-nowrap"
          >
            <Plus size={16} /> New Board
          </button>

          {/* Avatar */}
          <DropdownPortal
            trigger={
              <div className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-sm sm:text-base font-bold cursor-pointer">
                {userEmail.charAt(0).toUpperCase()}
              </div>
            }
            width={200}
          >
            <div style={{ padding: 8 }}>
              <div style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Hesabım</div>
                <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
              </div>
              <button onClick={handleSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px', fontSize: 13, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <LogOut size={14} /> Çıkış Yap
              </button>
            </div>
          </DropdownPortal>
        </div>
      </div>

      {inviteModalOpen && activeWorkspace && (
        <InviteModal workspaceId={activeWorkspace.id} onClose={() => setInviteModalOpen(false)} />
      )}
    </header>
  )
}
