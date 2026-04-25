import { useState } from 'react'
import { Search, Plus, SlidersHorizontal, ArrowUpDown } from 'lucide-react'
import { useBoardStore } from '../../lib/store'
import { insertGroup } from '../../lib/supabase'
import { DropdownPortal } from '../ui/DropdownPortal'
import { ColumnManager } from './ColumnManager'
import { toast } from 'sonner'

const GROUP_COLORS = ['#0073ea','#00c875','#e2445c','#fdab3d','#a25ddc','#037f4c','#bb3354','#ff7575']

interface Props {
  search: string
  onSearch: (v: string) => void
}

export function Toolbar({ search, onSearch }: Props) {
  const { activeWorkspaceId, setGroups, groups } = useBoardStore()
  const [adding, setAdding] = useState(false)
  const [groupName, setGroupName] = useState('')

  async function addGroup() {
    if (!groupName.trim() || !activeWorkspaceId) { setAdding(false); return }
    const color = GROUP_COLORS[groups.length % GROUP_COLORS.length]
    try {
      const g = await insertGroup({
        workspace_id: activeWorkspaceId,
        name: groupName.trim(),
        color,
        order: groups.length,
        collapsed: false,
      })
      setGroups([...groups, g])
      setGroupName('')
      setAdding(false)
      toast.success('Grup oluşturuldu')
    } catch (err: any) {
      toast.error(err.message || 'Grup oluşturulurken hata oluştu')
    }
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between px-4 py-3 md:px-8 gap-4 bg-[#181b34] border-b border-[#3b4266]">
      {/* Left: New Item */}
      <div className="flex items-center gap-2">
        {adding ? (
          <input
            autoFocus value={groupName}
            onChange={e => setGroupName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addGroup(); if (e.key === 'Escape') setAdding(false) }}
            onBlur={addGroup}
            placeholder="New Group..."
            className="text-sm bg-[#222741] text-white border border-[#579bfc] rounded px-3 py-2 outline-none w-[140px] sm:w-[180px]"
          />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white bg-[#579bfc] hover:bg-[#3b82f6] border-none rounded cursor-pointer transition-colors"
          >
            <Plus size={16} /> New Group
          </button>
        )}
      </div>

      {/* Right: Search, Filter, Sort, Columns */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: 10, color: '#a9abcd' }} />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search"
            style={{ background: '#222741', border: '1px solid #3b4266', color: '#fff', padding: '8px 12px 8px 32px', borderRadius: 20, outline: 'none', width: '100%', maxWidth: 200, fontSize: 14, fontFamily: 'inherit', transition: 'all .3s' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#579bfc'; e.currentTarget.style.minWidth = '200px' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#3b4266'; e.currentTarget.style.minWidth = '140px' }}
          />
        </div>

        {/* Filter dropdown */}
        <DropdownPortal
          trigger={
            <button
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#323956] rounded transition-colors"
            >
              <SlidersHorizontal size={16} className="text-[#a9abcd]" /> <span className="hidden sm:inline">Filter</span>
            </button>
          }
          width={220}
        >
          <div style={{ padding: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>Sıralama Ölçütü</div>
            {[
              { label: 'İsim (A-Z)', col: 'title', dir: 'asc' as const },
              { label: 'Durum', col: 'status', dir: 'asc' as const },
              { label: 'Öncelik', col: 'priority', dir: 'asc' as const },
              { label: 'Oluşturulma Tarihi', col: 'created_at', dir: 'desc' as const },
            ].map(({ label, col, dir }) => (
              <button key={label} onClick={() => useBoardStore.getState().setSorting(col, dir)}
                style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 13, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                {label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid #f3f4f6', margin: '6px 0' }} />
            <button onClick={() => useBoardStore.getState().setSorting(null, 'asc')}
              style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4 }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
              Sıralamayı Sıfırla
            </button>
          </div>
        </DropdownPortal>

        {/* Sort button */}
        <button
          className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#323956] rounded transition-colors"
        >
          <ArrowUpDown size={16} className="text-[#a9abcd]" /> <span className="hidden sm:inline">Sort</span>
        </button>

        {/* Column manager */}
        <ColumnManager />
      </div>
    </div>
  )
}
