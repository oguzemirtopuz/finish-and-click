import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  trigger: ReactNode
  children: ReactNode
  width?: number
}

/**
 * Dropdown içeriğini document.body'ye portal ile taşır.
 * Tablo overflow:hidden sorununu tamamen çözer.
 */
export function DropdownPortal({ trigger, children, width = 160 }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    if (!triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom
    const menuH = menuRef.current?.offsetHeight ?? 180

    setPos({
      top: spaceBelow > menuH ? r.bottom + 4 : r.top - menuH - 4,
      left: Math.min(r.left, window.innerWidth - width - 8),
    })
  }, [width])

  function toggle() {
    setOpen((v) => {
      if (!v) setTimeout(reposition, 0)
      return !v
    })
  }

  // Dışarı tıklanınca kapat
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={triggerRef} onClick={toggle} className="w-full h-full cursor-pointer">
      {trigger}
      {open && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width, zIndex: 9999 }}
          className="bg-[#141829] rounded-xl shadow-2xl border border-[#2C334A] py-1 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {children}
        </div>,
        document.body
      )}
    </div>
  )
}
