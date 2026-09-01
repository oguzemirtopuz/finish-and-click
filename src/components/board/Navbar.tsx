import { useState, useEffect } from 'react'
import { UserPlus, Plus, MoreHorizontal, LogOut, Pencil, Trash2, Menu } from 'lucide-react'
import { DropdownPortal } from '../ui/DropdownPortal'
import { InviteModal } from './InviteModal'
import { supabase, updateWorkspace, deleteWorkspace } from '../../lib/supabase'
import { useBoardStore } from '../../lib/store'

export function Navbar() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace, setMobileSidebarOpen } = useBoardStore()
  const activeWorkspace = workspaces.find((ws) => ws.id === activeWorkspaceId)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || 'Unknown')
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  async function handleCreateWorkspace() {
    const name = window.prompt('Enter the name of the new workspace:')
    if (!name?.trim()) return
    const type = window.confirm('Should this be a shared workspace? (OK: Shared, Cancel: Personal)') ? 'shared' : 'personal'

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), type, owner_id: user.id })
      .select()
      .single()

    if (error) { alert('Error: ' + error.message); return }
    if (data) {
      const newWs = data as any
      const store = useBoardStore.getState()
      store.setWorkspaces([...store.workspaces, newWs])
      setActiveWorkspace(newWs.id)
    }
  }

  async function handleRenameWorkspace() {
    if (!activeWorkspace) return
    const newName = window.prompt('Enter new name:', activeWorkspace.name)
    if (!newName?.trim() || newName === activeWorkspace.name) return
    try {
      await updateWorkspace(activeWorkspace.id, { name: newName.trim() })
      const store = useBoardStore.getState()
      store.setWorkspaces(store.workspaces.map(w => w.id === activeWorkspace.id ? { ...w, name: newName.trim() } : w))
    } catch (err: any) { alert('Error: ' + err.message) }
  }

  async function handleDeleteWorkspace() {
    if (!activeWorkspace) return
    if (!window.confirm(`Are you sure you want to delete workspace "${activeWorkspace.name}"?`)) return
    try {
      await deleteWorkspace(activeWorkspace.id)
      const store = useBoardStore.getState()
      const remaining = store.workspaces.filter(w => w.id !== activeWorkspace.id)
      store.setWorkspaces(remaining)
      if (remaining.length > 0) setActiveWorkspace(remaining[0].id)
    } catch (err: any) { alert('Error: ' + err.message) }
  }

  return (
    <header className="shrink-0 bg-[#181b34] border-b border-[#3b4266] py-3 px-3 md:pt-6 md:pb-0 md:px-6">
      {/* Başlık satırı — mobilde tek satır, taşma yok */}
      <div className="flex items-center justify-between gap-2 md:gap-4 md:mb-6">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {/* Mobil hamburger menü butonu */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden flex items-center justify-center w-10 h-10 shrink-0 rounded-lg hover:bg-white/10 text-[#a9abcd] cursor-pointer"
            aria-label="Menüyü aç"
          >
            <Menu size={22} />
          </button>
          {activeWorkspace ? (
            <>
              <h1 className="text-lg md:text-3xl font-bold text-white leading-tight truncate min-w-0">{activeWorkspace.name}</h1>
              <DropdownPortal
                trigger={
                  <button className="flex items-center justify-center w-8 h-8 shrink-0 rounded hover:bg-white/10 text-[#a9abcd] cursor-pointer" >
                    <MoreHorizontal size={18} />
                  </button>
                }
                width={160}
              >
                <div style={{ padding: 4 }}>
                  <button onClick={handleRenameWorkspace} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Pencil size={13} /> Rename
                  </button>
                  <button onClick={handleDeleteWorkspace} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', fontSize: 13, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </DropdownPortal>
            </>
          ) : (
            <h1 className="text-lg md:text-3xl font-bold text-white truncate min-w-0">New Custom Board</h1>
          )}
        </div>

        {/* Aksiyonlar — mobilde kompakt ikon butonlar */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {activeWorkspace && (
            <button
              onClick={() => setInviteModalOpen(true)}
              className="flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 text-sm font-medium text-white bg-transparent border border-[#3b4266] rounded-lg md:rounded cursor-pointer transition-colors hover:bg-[#323956]"
            >
              <UserPlus size={18} className="md:w-4 md:h-4" />
              <span className="hidden md:inline">Invite</span>
            </button>
          )}
          <button
            onClick={handleCreateWorkspace}
            className="flex items-center justify-center gap-2 w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 text-sm font-medium text-white bg-[#579bfc] hover:bg-[#3b82f6] border-none rounded-lg md:rounded cursor-pointer transition-colors whitespace-nowrap"
          >
            <Plus size={18} className="md:w-4 md:h-4" />
            <span className="hidden md:inline">New Board</span>
          </button>

          {/* Avatar — dokunmatik dostu boyut */}
          <DropdownPortal
            trigger={
              <div className="shrink-0 w-10 h-10 md:w-9 md:h-9 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-sm font-bold cursor-pointer">
                {userEmail.charAt(0).toUpperCase()}
              </div>
            }
            width={200}
          >
            <div style={{ padding: 8 }}>
              <div style={{ padding: '8px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>My Account</div>
                <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
              </div>
              <button onClick={handleSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px', fontSize: 13, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <LogOut size={14} /> Log Out
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
