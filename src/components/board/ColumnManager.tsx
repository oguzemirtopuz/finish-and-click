import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Columns3, Eye, EyeOff } from 'lucide-react'
import { useBoardStore } from '../../lib/store'
import { cn } from '../../lib/utils'

export function ColumnManager() {
  const { columns, toggleColumn } = useBoardStore()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: r.left })
    }
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (!btnRef.current?.contains(e.target as Node) &&
          !menuRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const hideable = columns.filter((c) => !c.fixed)
  const visible   = hideable.filter((c) => c.visible).length

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors',
          open
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
        )}
      >
        <Columns3 size={14} />
        Sütunlar
        {visible < hideable.length && (
          <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 rounded-full">
            {hideable.length - visible} gizli
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999, width: 240 }}
          className="bg-white rounded-xl shadow-2xl border border-gray-100 py-2"
        >
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-4 py-2">
            Sütunları Yönet
          </p>
          {columns.map((col) => (
            <div
              key={col.id}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 transition-colors',
                col.fixed ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer'
              )}
              onClick={() => !col.fixed && toggleColumn(col.id)}
            >
              <div className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0',
                col.visible ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
              )}>
                {col.visible && <span className="text-white text-[9px] font-bold">✓</span>}
              </div>
              <span className="text-[13px] text-gray-700 flex-1">{col.label}</span>
              {col.visible
                ? <Eye size={12} className="text-gray-400" />
                : <EyeOff size={12} className="text-gray-300" />
              }
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
