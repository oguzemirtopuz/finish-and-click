import { useState } from 'react'
import { FileText } from 'lucide-react'

interface Props {
  value: string | null
  onChange: (v: string) => void
}

export function NotesCell({ value, onChange }: Props) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(value ?? '')

  function commit() {
    setEditing(false)
    if (text !== (value ?? '')) onChange(text)
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        rows={2}
        className="w-full text-xs outline-none border border-blue-300 rounded-md px-2 py-1 bg-white resize-none shadow-sm"
        placeholder="Not ekle..."
      />
    )
  }

  return (
    <div
      onDoubleClick={() => setEditing(true)}
      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 cursor-default px-1 transition-colors"
    >
      <FileText size={12} className="flex-shrink-0 text-gray-300" />
      <span className="truncate">{value || <span className="text-gray-300 italic">Double click to add</span>}</span>
    </div>
  )
}
