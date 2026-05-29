import { useEffect, useState } from 'react'
import { X, Calendar, MessageSquare, CheckCircle2, User, Hash } from 'lucide-react'
import { useBoardStore } from '../../lib/store'
import { updateTask } from '../../lib/supabase'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'
import { TaskComments } from './TaskComments'

export function TaskDetailSidebar() {
  const { selectedTaskId, setSelectedTaskId, tasks, upsertTask } = useBoardStore()
  const task = tasks.find(t => t.id === selectedTaskId)
  
  const [title, setTitle] = useState('')
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setIsClosing(false)
    }
  }, [task?.id]) // Only reset when task ID changes

  useEffect(() => {
    if (task && !editingTitle) {
      setTitle(task.title || '')
    }
  }, [task?.title])

  const [editingTitle, setEditingTitle] = useState(false)

  if (!selectedTaskId && !isClosing) return null

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setSelectedTaskId(null)
      setIsClosing(false)
    }, 300) // Match animation duration
  }



  const saveTitle = async () => {
    if (!task || !title.trim()) {
        setTitle(task?.title || '')
        setEditingTitle(false)
        return
    }
    if (title === task.title) {
        setEditingTitle(false)
        return
    }

    try {
      upsertTask({ ...task, title })
      await updateTask(task.id, { title })
      setEditingTitle(false)
    } catch (err: any) {
      toast.error("Error updating title")
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
            "fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 transition-opacity duration-300",
            isClosing ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
      />

      {/* Sidebar Panel */}
      <div 
        className={cn(
          "fixed right-0 top-0 h-screen w-[35%] min-w-[400px] max-w-[600px] bg-[#1C1F2B] border-l border-[#2D313E] shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col",
          (selectedTaskId && !isClosing) ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#2D313E]">
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 text-[#808191] text-xs font-semibold mb-2 uppercase tracking-wider">
               <Hash size={12} />
               <span>Task Details</span>
            </div>
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                className="w-full text-2xl font-bold bg-[#252836] text-white border border-blue-500 rounded px-2 py-1 outline-none"
              />
            ) : (
              <h2 
                onClick={() => setEditingTitle(true)}
                className="text-2xl font-bold text-white cursor-text hover:bg-[#252836] rounded px-2 -ml-2 py-1 transition-colors"
              >
                {title || "Untitled Task"}
              </h2>
            )}
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-[#2D313E] rounded-full text-[#808191] hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#252836] p-4 rounded-xl border border-[#2D313E]">
                <div className="flex items-center gap-2 text-[#808191] text-xs mb-2">
                    <CheckCircle2 size={14} />
                    <span>Status</span>
                </div>
                <div className="text-sm font-medium text-white flex items-center gap-2 capitalize">
                    {task?.status === 'done' ? 'Done' : task?.status === 'in_progress' ? 'In Progress' : 'Waiting'}
                </div>
            </div>
            <div className="bg-[#252836] p-4 rounded-xl border border-[#2D313E]">
                <div className="flex items-center gap-2 text-[#808191] text-xs mb-2">
                    <User size={14} />
                    <span>Assignee</span>
                </div>
                <div className="text-sm font-medium text-white truncate">
                    {(() => {
                      const { members } = useBoardStore.getState()
                      const profile = members.find(m => m.id === task?.assigned_to)
                      return profile ? (profile.full_name || profile.email) : 'Unassigned'
                    })()}
                </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="flex-1 min-h-[400px]">
             {task && (
               <TaskComments 
                 task={task} 
                 onClearLegacyNotes={async () => {
                   upsertTask({ ...task, notes: null })
                   await updateTask(task.id, { notes: null })
                 }}
               />
             )}
          </div>

          {/* Activity Placeholder */}
          <div className="pt-4 border-t border-[#2D313E]">
             <div className="flex items-center gap-2 text-[#808191] font-semibold mb-4">
                <MessageSquare size={18} />
                <span>Recent Activity</span>
             </div>
             <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#3E4255] flex items-center justify-center text-xs text-white">AS</div>
                    <div>
                        <div className="text-xs text-gray-400">
                            <span className="text-blue-400 font-medium cursor-pointer">You</span> created this task
                        </div>
                        <div className="text-[10px] text-gray-500">Today, 14:20</div>
                    </div>
                </div>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-[#13151F] border-t border-[#2D313E] flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#808191] text-[10px]">
                <Calendar size={12} />
                <span>Created At: {task?.created_at ? new Date(task.created_at).toLocaleDateString('en-US') : '-'}</span>
            </div>
            <button 
                onClick={handleClose}
                className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-lg shadow-blue-500/10"
            >
                Close
            </button>
        </div>
      </div>
    </>
  )
}
