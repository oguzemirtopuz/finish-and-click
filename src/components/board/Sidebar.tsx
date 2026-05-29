import { Bell, Inbox, Plus, LayoutGrid, Hash, Briefcase, Home } from 'lucide-react'
import { useBoardStore } from '../../lib/store'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import { toast } from 'sonner'

export function Sidebar() {
  const { workspaces, activeWorkspaceId, setActiveWorkspace } = useBoardStore()

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

  const uniqueWorkspaces = workspaces.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
  const personalWorkspaces = uniqueWorkspaces.filter(ws => ws.type === 'personal')
  const sharedWorkspaces = uniqueWorkspaces.filter(ws => ws.type === 'shared')

  return (
    <aside style={{ width: 220, background: '#282f4c', borderRight: '1px solid #3b4266', flexShrink: 0 }} className="flex flex-col h-full">
      {/* Logo */}
      <div style={{ padding: '16px 16px 16px 16px', borderBottom: '1px solid #3b4266' }} className="flex items-center gap-3">
        <div style={{
          width: 32, height: 32, borderRadius: 6, flexShrink: 0,
          background: 'linear-gradient(135deg, #FF3D00, #FFEA00, #00E676, #00B0FF, #D500F9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <LayoutGrid size={18} color="white" />
        </div>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>Finish and Click</span>
      </div>

      {/* Nav */}
      <div style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
        {/* Top nav items */}
        <div style={{ marginBottom: 8 }}>
          {[
            { 
              icon: <Home size={18} />, 
              label: 'Main Workspace',
              onClick: () => {
                if (workspaces && workspaces.length > 0) {
                  setActiveWorkspace(workspaces[0].id)
                  toast.success('Workspace Switched', {
                    description: `Successfully loaded main workspace: ${workspaces[0].name}`,
                    duration: 3000
                  })
                } else {
                  toast.error('No Workspace Found', {
                    description: 'Please create a workspace first.'
                  })
                }
              }
            },
            { 
              icon: <Bell size={18} />, 
              label: 'Notifications',
              onClick: () => {
                toast.info('All Caught Up!', {
                  description: 'Congratulations! You have no new unread notifications.',
                  duration: 4000
                })
              }
            },
            { 
              icon: <Inbox size={18} />, 
              label: 'Inbox',
              onClick: () => {
                toast.info('Inbox Cleared', {
                  description: 'Your inbox is clean! All tasks and workflows are up to date.',
                  duration: 4000
                })
              }
            },
          ].map(({ icon, label, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              style={{ padding: '8px 12px', gap: 12, color: '#a9abcd', fontSize: 14, fontWeight: 500, width: '100%', display: 'flex', alignItems: 'center', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#323956'; (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#a9abcd' }}
            >
              <span style={{ color: '#a9abcd' }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#3b4266', margin: '8px 0' }} />

        {/* Workspaces section */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 8px', color: '#a9abcd', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <span>Workspaces</span>
            <button
              onClick={handleCreateWorkspace}
              style={{ background: 'none', border: 'none', color: '#a9abcd', cursor: 'pointer', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#fff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#a9abcd' }}
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Personal Workspaces */}
          {personalWorkspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspace(ws.id)}
              className={cn('w-full text-left')}
              style={{
                padding: '7px 12px', gap: 10, fontSize: 14, fontWeight: 500,
                display: 'flex', alignItems: 'center', borderRadius: 6,
                background: activeWorkspaceId === ws.id ? 'rgba(255,255,255,0.1)' : 'none',
                color: activeWorkspaceId === ws.id ? '#fff' : '#a9abcd',
                border: 'none', cursor: 'pointer', width: '100%', transition: 'all .2s',
              }}
              onMouseEnter={e => { if (activeWorkspaceId !== ws.id) { (e.currentTarget as HTMLElement).style.background = '#323956'; (e.currentTarget as HTMLElement).style.color = '#fff' } }}
              onMouseLeave={e => { if (activeWorkspaceId !== ws.id) { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#a9abcd' } }}
            >
              <Hash size={16} style={{ flexShrink: 0, color: activeWorkspaceId === ws.id ? '#579bfc' : '#a9abcd' }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
            </button>
          ))}

          {/* Shared Workspaces */}
          {sharedWorkspaces.map(ws => (
            <button
              key={ws.id}
              onClick={() => setActiveWorkspace(ws.id)}
              className={cn('w-full text-left')}
              style={{
                padding: '7px 12px', gap: 10, fontSize: 14, fontWeight: 500,
                display: 'flex', alignItems: 'center', borderRadius: 6,
                background: activeWorkspaceId === ws.id ? 'rgba(255,255,255,0.1)' : 'none',
                color: activeWorkspaceId === ws.id ? '#fff' : '#a9abcd',
                border: 'none', cursor: 'pointer', width: '100%', transition: 'all .2s',
              }}
              onMouseEnter={e => { if (activeWorkspaceId !== ws.id) { (e.currentTarget as HTMLElement).style.background = '#323956'; (e.currentTarget as HTMLElement).style.color = '#fff' } }}
              onMouseLeave={e => { if (activeWorkspaceId !== ws.id) { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#a9abcd' } }}
            >
              <Briefcase size={16} style={{ flexShrink: 0, color: activeWorkspaceId === ws.id ? '#579bfc' : '#a9abcd' }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ws.name}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
