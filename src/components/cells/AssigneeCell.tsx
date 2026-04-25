import { useState, useEffect } from 'react'
import { DropdownPortal } from '../ui/DropdownPortal'
import { useBoardStore } from '../../lib/store'
import type { Profile } from '../../types/db'

const COLORS = ['#0073ea', '#00c875', '#e2445c', '#fdab3d', '#a25ddc', '#037f4c']

function color(name: string) {
    let h = 0
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
    return COLORS[Math.abs(h) % COLORS.length]
}

function displayName(m: Profile) {
    return m.full_name || m.email
}

interface Props {
    value: string | null
    onChange: (v: string | null) => void
}

export function AssigneeCell({ value, onChange }: Props) {
    const { members, activeWorkspaceId, workspaces } = useBoardStore()
    const [search, setSearch] = useState('')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)

    useEffect(() => {
        import('../../lib/supabase').then(({ supabase }) => {
            supabase.auth.getUser().then(({ data }) => {
                if (data.user) {
                    setCurrentUserId(data.user.id)
                    setCurrentUserEmail(data.user.email ?? null)
                }
            })
        })
    }, [])

    const currentWs = workspaces.find((w) => w.id === activeWorkspaceId)

    const availableMembers: Profile[] = [...members]

    if (currentUserId && currentUserEmail && !availableMembers.some((m) => m.id === currentUserId)) {
        availableMembers.push({ id: currentUserId, email: currentUserEmail, full_name: null })
    }

    const ORTAK_ID = 'Ortak'
    if (currentWs?.type === 'personal' && !availableMembers.some((m) => m.id === ORTAK_ID)) {
        availableMembers.unshift({ id: ORTAK_ID, email: 'ortak@workspace.internal', full_name: 'Ortak' })
    }

    const filtered = availableMembers.filter((m) =>
        displayName(m).toLowerCase().includes(search.toLowerCase())
    )

    const selectedProfile = availableMembers.find((m) => m.id === value)

    const trigger = selectedProfile ? (
        <div className="flex items-center gap-1.5 cursor-pointer group/av">
            <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-white"
                style={{ background: color(selectedProfile.email) }}
            >
                {displayName(selectedProfile)[0].toUpperCase()}
            </div>
            <span className="text-xs text-gray-700 group-hover/av:text-blue-600 transition-colors truncate max-w-[90px]">
                {displayName(selectedProfile)}
            </span>
        </div>
    ) : (
        <div className="flex items-center justify-center w-full cursor-pointer group/av">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold bg-[#0073ea] ring-2 ring-[#0F111A]">
                ?
            </div>
        </div>
    )

    return (
        <DropdownPortal trigger={trigger} width={180}>
            <div className="px-3 pt-2 pb-1">
                <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="İsim ara..."
                    className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 outline-none"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
            {value && (
                <button
                    onMouseDown={(e) => { e.preventDefault(); onChange(null) }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50"
                >
                    Görevi kaldır
                </button>
            )}

            {filtered.map((m) => (
                <button
                    key={m.id}
                    onMouseDown={(e) => { e.preventDefault(); onChange(m.id) }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-gray-50 transition-colors"
                >
                    <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                        style={{ background: color(m.email) }}
                    >
                        {displayName(m)[0].toUpperCase()}
                    </div>
                    <span className={m.id === value ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                        {displayName(m)}
                    </span>
                    {m.id === value && <span className="ml-auto text-blue-500 text-[10px]">✓</span>}
                </button>
            ))}
        </DropdownPortal>
    )
}
