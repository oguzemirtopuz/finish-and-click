import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase, fetchTaskComments, insertTaskComment, uploadCommentImage, deleteTaskComment, deleteAllTaskComments } from '../../lib/supabase'
import type { Task, TaskComment } from '../../types/db'
import { MessageSquare, Image as ImageIcon, Send, CornerDownRight, X, Loader2, Trash2, ArchiveRestore } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '../../lib/utils'
import { useBoardStore } from '../../lib/store'

interface Props {
  task: Task
  onClearLegacyNotes: () => void
}

export function TaskComments({ task, onClearLegacyNotes }: Props) {
  const taskId = task.id
  const { setCommentCount } = useBoardStore()
  const [comments, setComments] = useState<TaskComment[]>([])
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState('')
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const contentInputRef = useRef<HTMLTextAreaElement>(null)

  // ESC ile lightbox kapat
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxUrl(null) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  // Store'a comment count bildir (ikon rengi için)
  useEffect(() => {
    setCommentCount(taskId, comments.length)
  }, [comments.length, taskId])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      const data = await fetchTaskComments(taskId)
      if (mounted) {
        setComments(data)
        setLoading(false)
      }
    }
    load()

    // Realtime subscription for new comments
    const channel = supabase.channel(`comments-${taskId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments', filter: `task_id=eq.${taskId}` },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newComment = payload.new as TaskComment
            const { data: profileData } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', newComment.user_id)
              .single()
            
            const withProfile = { ...newComment, user_email: profileData?.email }
            setComments(prev => [...prev, withProfile])
          } else if (payload.eventType === 'DELETE') {
            setComments(prev => prev.filter(c => c.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [taskId])

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
  }, [])

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Bu yorumu silmek istediğinize emin misiniz?")) return
    try {
      await deleteTaskComment(commentId)
    } catch (err: any) {
      toast.error('Yorum silinemedi: ' + err.message)
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm("Tüm yorumları ve notları kalıcı olarak silmek istediğinize emin misiniz?")) return
    try {
      await deleteAllTaskComments(taskId)
      if (task.notes) {
        onClearLegacyNotes()
      }
      toast.success("Tüm notlar temizlendi.")
    } catch (err: any) {
      toast.error('Temizleme işlemi başarısız: ' + err.message)
    }
  }

  const convertLegacyToComment = async () => {
    if (!task.notes) return
    try {
      await insertTaskComment({
        task_id: taskId,
        user_id: currentUserId,
        parent_id: null,
        content: task.notes,
        image_url: null
      })
      onClearLegacyNotes()
      toast.success("Eski not yoruma dönüştürüldü.")
    } catch (err: any) {
      toast.error("Dönüştürme başarısız: " + err.message)
    }
  }

  const handleSend = async (imageUrl?: string) => {
    if (!content.trim() && !imageUrl) return
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      await insertTaskComment({
        task_id: taskId,
        user_id: user?.id || null,
        parent_id: replyTo?.id || null,
        content: content.trim(),
        image_url: imageUrl || null
      })
      
      setContent('')
      setReplyTo(null)
    } catch (err: any) {
      toast.error('Yorum gönderilemedi: ' + err.message)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB dan küçük olmalıdır.')
      return
    }

    try {
      setUploading(true)
      const url = await uploadCommentImage(file)
      await handleSend(url)
    } catch (err: any) {
      toast.error('Görsel yüklenemedi: ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return

    try {
      setUploading(true)
      const url = await uploadCommentImage(file)
      await handleSend(url)
    } catch (err: any) {
      toast.error('Görsel yüklenemedi: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    let imageFound = false

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile()
        if (!file) continue

        imageFound = true
        try {
          setUploading(true)
          const url = await uploadCommentImage(file)
          await handleSend(url)
        } catch (err: any) {
          toast.error('Görsel yüklenemedi: ' + err.message)
        } finally {
          setUploading(false)
        }
      }
    }
  }

  const rootComments = comments.filter(c => !c.parent_id)
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId)

  const renderComment = (comment: TaskComment, isReply = false) => {
    const replies = getReplies(comment.id)
    const initials = comment.user_email ? comment.user_email.substring(0, 2).toUpperCase() : 'U'
    
    return (
      <div key={comment.id} className={cn("flex flex-col gap-2 relative group", isReply && "ml-8 mt-2")}>
        <div className="flex gap-3 relative">
          <div className="w-8 h-8 rounded-full bg-[#3E4255] shrink-0 flex items-center justify-center text-xs text-white font-medium">
            {initials}
          </div>
          <div className="flex-1 bg-[#252836] p-3 rounded-xl border border-[#2D313E] relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-blue-400">
                {comment.user_email?.split('@')[0] || 'Kullanıcı'}
              </span>
              <span className="text-[10px] text-gray-500">
                {new Date(comment.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            
            {comment.content && (
              <p className="text-sm text-[#E4E4E6] whitespace-pre-wrap leading-relaxed">
                {comment.content}
              </p>
            )}
            
            {comment.image_url && (
              <div className="mt-2 rounded-lg overflow-hidden border border-[#2D313E] inline-block">
                <img
                  src={comment.image_url}
                  alt="Eklenen görsel"
                  className="max-w-full max-h-[200px] object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
                  onClick={() => setLightboxUrl(comment.image_url!)}
                />
              </div>
            )}
            
            {!isReply && (
              <button 
                onClick={() => {
                  setReplyTo(comment)
                  contentInputRef.current?.focus()
                }}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-blue-400 transition-colors"
              >
                <CornerDownRight size={12} />
                Yanıt Ver
              </button>
            )}

            {currentUserId === comment.user_id && (
              <button 
                onClick={() => handleDelete(comment.id)}
                className="absolute top-3 right-3 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Yorumu Sil"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        
        {replies.length > 0 && (
          <div className="flex flex-col gap-2">
            {replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Lightbox — body'e portal ile render (overflow kısıtlamasından kaçmak için) */}
      {lightboxUrl && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-md"
          style={{ zIndex: 99999 }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-5 right-5 text-white bg-white/10 hover:bg-white/25 rounded-full p-2.5 transition-colors"
            onClick={() => setLightboxUrl(null)}
            title="Kapat (ESC)"
          >
            <X size={22} />
          </button>
          <img
            src={lightboxUrl}
            alt="Tam ekran görsel"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      <div className="flex flex-col h-full gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold">
            <MessageSquare size={18} className="text-blue-400" />
            <span>Yorumlar & Notlar</span>
          </div>
          <button
            onClick={handleClearAll}
            className="text-[11px] flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors bg-[#252836] px-2 py-1 rounded"
          >
            <Trash2 size={12} />
            Tümünü Temizle
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 min-h-[300px]">
          {task.notes && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 shrink-0 flex items-center justify-center text-xs text-blue-400 font-medium border border-blue-500/30">
                  ES
                </div>
                <div className="flex-1 bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                      <ArchiveRestore size={12} />
                      Görev Açıklaması (Eski Not)
                    </span>
                  </div>
                  <p className="text-sm text-[#E4E4E6] whitespace-pre-wrap leading-relaxed">
                    {task.notes}
                  </p>
                  <button 
                    onClick={convertLegacyToComment}
                    className="mt-3 text-[11px] font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded transition-colors"
                  >
                    Yoruma Dönüştür
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">
              <Loader2 className="animate-spin mr-2" size={18} /> Yükleniyor...
            </div>
          ) : rootComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-sm">
              <MessageSquare size={24} className="mb-2 opacity-50" />
              Henüz yorum yapılmamış
            </div>
          ) : (
            rootComments.map(c => renderComment(c))
          )}
        </div>

        <div 
          className="mt-auto bg-[#252836] rounded-xl border border-[#2D313E] p-3 transition-colors focus-within:border-blue-500/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {replyTo && (
            <div className="flex items-center justify-between bg-[#1D1F2B] px-3 py-1.5 rounded-md mb-2">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <CornerDownRight size={12} />
                <span className="text-blue-400 font-medium">{replyTo.user_email?.split('@')[0]}</span> kişisine yanıt veriliyor
              </span>
              <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-white">
                <X size={14} />
              </button>
            </div>
          )}
          
          <textarea
            ref={contentInputRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            onPaste={handlePaste}
            placeholder="Yorumunuzu yazın, görsel sürükleyin veya yapıştırın..."
            className="w-full bg-transparent text-sm text-white placeholder:text-[#505363] outline-none resize-none min-h-[60px]"
          />
          
          <div className="flex items-center justify-between pt-2 border-t border-[#2D313E] mt-2">
            <div className="flex items-center gap-2">
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#323956] rounded-md transition-colors disabled:opacity-50"
                title="Görsel Ekle"
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
              </button>
              <span className="text-[10px] text-gray-500 hidden sm:inline-block">veya sürükleyip bırakın</span>
            </div>
          
            <button 
              onClick={() => handleSend()}
              disabled={(!content.trim() && !uploading) || uploading}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-[#323956] disabled:text-gray-500 text-white p-1.5 rounded-md transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
