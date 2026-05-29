import { useState, useEffect } from 'react'
import { DropdownPortal } from '../ui/DropdownPortal'
import { useBoardStore } from '../../lib/store'
import { toast } from 'sonner'

const COLORS = ['#0073ea', '#00c875', '#e2445c', '#fdab3d', '#a25ddc', '#037f4c']

function color(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

interface Props {
  value: string | null // UUID
  onChange: (v: string | null) => void
}

export function ResponsibleCell({ value, onChange }: Props) {
  const { members, activeWorkspaceId } = useBoardStore()
  const [search, setSearch] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

  useEffect(() => {
    import('../../lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user) {
          setCurrentUserId(data.user.id)
          setCurrentUserEmail(data.user.email || null)
        }
      })
    })
  }, [])

  // Build the list (members are now Profile objects: { id, email })
  const availableMembers = [...members]

  // Always include the current user (if not already in the list)
  if (currentUserId && currentUserEmail && !availableMembers.some(m => m.id === currentUserId)) {
    availableMembers.push({ id: currentUserId, email: currentUserEmail, full_name: null })
  }

  const filtered = availableMembers.filter((m) =>
    (m.full_name?.toLowerCase().includes(search.toLowerCase())) ||
    (m.email.toLowerCase().includes(search.toLowerCase()))
  )

  // Find the selected profile
  const selectedProfile = members.find(m => m.id === value) || availableMembers.find(m => m.id === value)
  const getDisplayName = (m: any) => m.full_name || m.email

  const [addingCustom, setAddingCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [savingCustom, setSavingCustom] = useState(false)

  async function handleAddCustom() {
    if (!customName.trim() || !activeWorkspaceId) return
    setSavingCustom(true)
    try {
      const { insertWorkspaceContact } = await import('../../lib/supabase')
      const newMember = await insertWorkspaceContact(activeWorkspaceId, customName.trim())

      // Update the store (add to local list)
      const { setMembers, members: existing } = useBoardStore.getState()
      setMembers([...existing, newMember])

      // Select and close
      onChange(newMember.id)
      setAddingCustom(false)
      setCustomName('')
      setSearch('')
      toast.success(`"${newMember.full_name ?? newMember.email}" added as assignee`)
    } catch (err: any) {
      console.error("Custom member error:", err)
      // FK constraint error (23503) or other DB error
      if (err?.code === '23503') {
        toast.error('Database constraint: please check the workspace_contacts table and its FK constraint.')
      } else if (err?.code === '42P01') {
        toast.error('The workspace_contacts table does not exist yet. Run the SQL migration in Supabase.')
      } else {
        toast.error('Error adding assignee: ' + (err?.message ?? 'Unknown error'))
      }
    } finally {
      setSavingCustom(false)
    }
  }

  const trigger = selectedProfile ? (
    <div className="flex items-center justify-center w-full gap-1.5 cursor-pointer group/av px-4">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-[#0F111A] flex-shrink-0"
        style={{ background: color(selectedProfile.email) }}
      >
        {getDisplayName(selectedProfile)[0].toUpperCase()}
      </div>
      <span className="text-xs text-gray-400 group-hover/av:text-white transition-colors truncate max-w-[80px]">
        {getDisplayName(selectedProfile)}
      </span>
    </div>
  ) : value ? (
    <div className="flex items-center justify-center w-full gap-1.5 cursor-pointer group/av px-4">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-[#0F111A] bg-gray-500 flex-shrink-0">
        ?
      </div>
      <span className="text-xs text-gray-400 truncate max-w-[80px]">Unknown</span>
    </div>
  ) : (
    <div className="flex items-center justify-center w-full cursor-pointer group/av hover:opacity-80 transition-opacity px-4">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold bg-[#20263c] border border-dashed border-gray-600">
        +
      </div>
    </div>
  )

  return (
    <DropdownPortal trigger={trigger} width={220}>
      <div className="px-3 pt-2 pb-1">
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="w-full text-xs bg-[#1A1F36] border border-[#2A2E44] text-white rounded-md px-2 py-1.5 outline-none focus:border-blue-500"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      {value && !addingCustom && (
        <button
          onMouseDown={(e) => { e.preventDefault(); onChange(null) }}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors border-b border-[#1D1F2B]"
        >
          Remove assignee
        </button>
      )}

      <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
        {!addingCustom && filtered.map((m) => (
          <button
            key={m.id}
            onMouseDown={(e) => { e.preventDefault(); onChange(m.id) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#20263c] transition-colors text-left"
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ background: color(m.email) }}
            >
              {getDisplayName(m)[0].toUpperCase()}
            </div>
            <div className="flex flex-col truncate">
              <span className={m.id === value ? 'font-semibold text-white truncate' : 'text-gray-300 truncate'}>
                {getDisplayName(m)}
              </span>
              {m.full_name && (
                <span className="text-[10px] text-gray-500 truncate">{m.email}</span>
              )}
            </div>
            {m.id === value && <span className="ml-auto text-blue-500 text-[10px]">✓</span>}
          </button>
        ))}

        {addingCustom ? (
          <div className="p-2 space-y-2 bg-[#1A1F36]">
            <input
              autoFocus
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Enter name (e.g. Oguz)"
              className="w-full text-xs bg-[#0F111A] border border-[#2D313E] text-white rounded-md px-2 py-1.5 outline-none"
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
            />
            <div className="flex gap-2">
              <button
                onMouseDown={(e) => { e.preventDefault(); handleAddCustom() }}
                disabled={savingCustom}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-[10px] py-1 rounded"
              >
                {savingCustom ? '...' : 'Add'}
              </button>
              <button
                onMouseDown={(e) => { e.preventDefault(); setAddingCustom(false) }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-[10px] py-1 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onMouseDown={(e) => { e.preventDefault(); setAddingCustom(true) }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-blue-400 hover:bg-blue-500/10 transition-colors border-t border-[#1D1F2B] font-medium"
          >
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[12px]">
              +
            </div>
            <span>Add Assignee</span>
          </button>
        )}

        {filtered.length === 0 && !addingCustom && (
          <div className="px-3 py-3 text-xs text-gray-500 text-center">
            No users found
          </div>
        )}
      </div>
    </DropdownPortal>
  )
}
