import { LayoutList, Kanban, Calendar as CalendarIcon, Plus } from 'lucide-react'
import { useBoardStore, type ViewMode } from '../../lib/store'

const TABS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'table',  label: 'Main Table', icon: <LayoutList size={15} /> },
  { id: 'kanban', label: 'Kanban',     icon: <Kanban size={15} /> },
  { id: 'kanban', label: 'Calendar',   icon: <CalendarIcon size={15} /> },
]

export function ViewTabs() {
  const { viewMode, setViewMode } = useBoardStore()

  return (
    <div className="flex items-center gap-1 md:gap-4 border-b border-[#3b4266] bg-[#181b34] px-6 py-2 md:py-0 overflow-x-auto scrollbar-hide">
      {TABS.map((tab, idx) => (
        <button
          key={idx}
          onClick={() => setViewMode(tab.id)}
          className={`flex items-center gap-2 px-3 md:px-4 py-2 md:py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 mt-[2px] ${
            (viewMode === tab.id && (tab.id === 'table' ? idx === 0 : true)) || (viewMode === 'kanban' && idx > 0)
              ? 'text-white border-[#579bfc]'
              : 'text-[#a9abcd] border-transparent hover:text-white'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
      <button className="flex items-center p-2 text-[#a9abcd] hover:text-white shrink-0 ml-auto md:ml-0 cursor-pointer">
        <Plus size={16} />
      </button>
    </div>
  )
}
