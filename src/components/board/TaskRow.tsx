import { useState } from 'react'
import { ChevronRight, Pencil, Trash2, Plus, MessageSquare } from 'lucide-react'
import type { Task } from '../../types/db'
import { updateTask, deleteTask, recalculateProgress, insertTask, markSubtasksDone } from '../../lib/supabase'
import { toast } from 'sonner'
import { useBoardStore, type ColumnDef } from '../../lib/store'
import { StatusCell } from '../cells/StatusCell'
import { TimelineCell } from '../cells/TimelineCell'
import { RatingCell } from '../cells/RatingCell'
import { ProgressCell } from '../cells/ProgressCell'
import { PriorityCell } from '../cells/PriorityCell'
import { ResponsibleCell } from '../cells/ResponsibleCell'
import { BudgetCell } from '../cells/BudgetCell'
import { SubTaskRow } from './SubTaskRow'
import { STRIPE_W, CHECKBOX_W } from './columns'
import { cn } from '../../lib/utils'

interface Props {
  task: Task
  subtasks: Task[]
  groupColor: string
  columns: ColumnDef[]
}

export function TaskRow({ task, subtasks, groupColor, columns }: Props) {
  const { upsertTask, setSelectedTaskId, commentCounts } = useBoardStore()
  const hasNote = !!(task.notes && task.notes.trim()) || (commentCounts[task.id] ?? 0) > 0
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [subTitle, setSubTitle] = useState('')

  async function update<K extends keyof Task>(field: K, value: Task[K]) {
    upsertTask({ ...task, [field]: value })
    await updateTask(task.id, { [field]: value } as Partial<Task>)
  }

  async function handleResponsible(value: string | null) {
    try {
      const store = useBoardStore.getState()
      const currentWs = store.workspaces.find(w => w.id === store.activeWorkspaceId)

      // Optimistic update
      upsertTask({ ...task, assigned_to: value })

      // DB update
      await updateTask(task.id, { assigned_to: value })

      if (value === 'Ortak') {
        if (!currentWs || currentWs.type !== 'personal') return

        const { ensureSharedWorkspace, moveTaskToWorkspace, supabase } = await import('../../lib/supabase')
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          toast.error("Lütfen oturum açın.")
          return
        }

        const targetName = `${currentWs.name} - Ortak`
        const sharedWorkspaces = store.workspaces.filter(w => w.type === 'shared')
        let targetWs = sharedWorkspaces.find(w => w.name === targetName)

        // Eğer birebir isim eşleşen yoksa kullanıcıya seçenek sunalım
        if (!targetWs) {
          if (sharedWorkspaces.length > 0) {
            const names = sharedWorkspaces.map(w => w.name).join(', ')
            const useExisting = window.confirm(
              `"${targetName}" adında bir ortak alan henüz yok.\n\n` +
              `Mevcut ortak alanlardan birini mi kullanmak istersiniz? (${names})\n\n` +
              `Yoksa bu göreve özel yeni bir "${targetName}" alanı oluşturulsun mu? (İptal = Yeni Oluştur)`
            )
            if (useExisting) {
              // Basitlik için ilkini seçiyoruz, ileride modal ile seçim yaptırılabilir
              targetWs = sharedWorkspaces[0]
            }
          } else {
            // Hiç ortak alan yoksa bile onaysız oluşturmayalım
            const createNew = window.confirm(
              `Görevi ortak bir alana taşımak üzeresiniz.\n\n` +
              `"${targetName}" isminde yeni bir ortak çalışma alanı oluşturulsun mu?`
            )
            if (!createNew) {
              // İşlemi geri al (assigned_to'yu eski haline getir veya null yap)
              upsertTask({ ...task, assigned_to: null })
              await updateTask(task.id, { assigned_to: null })
              return
            }
          }
        }

        // Seçilen veya oluşturulması gereken workspace'i kesinleştir
        if (!targetWs) {
          targetWs = await ensureSharedWorkspace(currentWs.id, user.id)
        }

        if (!targetWs) throw new Error("Hedef çalışma alanı belirlenemedi.")

        await moveTaskToWorkspace(task.id, targetWs.id)

        // UI'dan kaldır
        store.setTasks(store.tasks.filter(t => t.id !== task.id))
        toast.success(`"${task.title}" görevi “${targetWs.name}” alanına başarıyla taşındı.`)
      }
    } catch (err: any) {
      console.error("Migration error:", err)
      toast.error("Bir hata oluştu: " + err.message)
    }
  }


  async function handleStatus(status: string) {
    const isDone = status === 'done';
    let newProgress = task.progress;

    // 1. MANTIK HESAPLAMA: İlerleme barı ne olacak?
    if (isDone) {
      // Eğer ana görev Done ise, ilerleme direkt %100'dür
      newProgress = 100;
    } else {
      // Eğer Done'dan geri çekilirse (örn: Test), alt görevlere bakarak barı yeniden hesapla
      if (subtasks && subtasks.length > 0) {
        const doneCount = subtasks.filter(s => s.status === 'done').length;
        newProgress = Math.round((doneCount / subtasks.length) * 100);
      } else {
        newProgress = 0;
      }
    }

    // 2. YEREL GÜNCELLEME (Hız için - Kullanıcı A anında görsün)
    upsertTask({
      ...task,
      status: status as Task['status'],
      progress: newProgress
    });

    // 3. VERİTABANI GÜNCELLEME (Kalıcı olması ve Kullanıcı B'nin ekranına düşmesi için)
    await updateTask(task.id, {
      status: status as Task['status'],
      progress: newProgress
    });

    // 4. ALT GÖREVLERİN DOMİNO ETKİSİ
    if (isDone && subtasks.length > 0) {
      // Local'deki tüm alt görevleri pıt pıt yeşil yap
      subtasks.forEach(sub => {
        upsertTask({ ...sub, status: 'done', progress: 100 });
      });
      // DB'deki tüm alt görevleri topluca bitir
      await markSubtasksDone(task.id);
    }

    // 5. EĞER BU BİR ALT GÖREVSE: Üstündeki ana görevin barını güncelle
    if (task.parent_id) {
      await recalculateProgress(task.parent_id);
    }
  }
  async function commitTitle() {
    setEditingTitle(false)
    if (title === task.title) return
    if (!title.trim()) { setTitle(task.title); return }
    upsertTask({ ...task, title })
    await updateTask(task.id, { title })
  }

  async function handleDelete() {
    if (!window.confirm('Bu görevi silmek istediğinize emin misiniz?')) return
    try {
      await deleteTask(task.id)
      toast.success('Görev silindi')
    } catch (err: any) {
      toast.error('Görev silinirken hata oluştu: ' + err.message)
    }
  }

  async function addSubtask() {
    const trimmed = subTitle.trim()
    setAddingSubtask(false)
    setSubTitle('')
    if (!trimmed) return
    const newSub = await insertTask({
      group_id: task.group_id,
      parent_id: task.id,
      title: trimmed,
      status: 'todo',
      priority: 'medium',
      assigned_to: null,
      start_date: null,
      end_date: null,
      rating: null,
      numeric_value: null,
      progress: 0,
      order: subtasks.length,
    })
    upsertTask(newSub)
    setExpanded(true)
    await recalculateProgress(task.id)
  }

  const hasSubtasks = subtasks.length > 0
  const visibleCols = columns.filter((c) => c.visible)

  function renderCell(col: ColumnDef) {
    switch (col.id) {
      case 'status':
        return (
          <div className="flex w-full items-stretch h-full">
            <StatusCell value={task.status} onChange={handleStatus} />
          </div>
        )
      case 'assignee':
        return (
          <div className="flex items-center w-full">
            <ResponsibleCell value={task.assigned_to} onChange={handleResponsible} />
          </div>
        )
      case 'timeline':
        return (
          <div className="flex items-center w-full">
            <TimelineCell
              startDate={task.start_date}
              endDate={task.end_date}
              onChange={(s, e) => { update('start_date', s); update('end_date', e) }}
            />
          </div>
        )
      case 'priority':
        return (
          <div className="flex w-full items-stretch h-full">
            <PriorityCell value={task.priority ?? 'medium'} onChange={(v) => update('priority', v as Task['priority'])} />
          </div>
        )
      case 'progress':
        return (
          <div className="flex items-center w-full">
            <ProgressCell value={task.progress} />
          </div>
        )
      case 'rating':
        return (
          <div className="flex items-center w-full">
            <RatingCell value={task.rating} onChange={(v) => update('rating', v)} />
          </div>
        )
      case 'budget':
        return (
          <div className="flex items-center w-full">
            <BudgetCell value={task.numeric_value} onChange={(v) => update('numeric_value', v)} />
          </div>
        )
      case 'notes':
        return (
          <div className="flex items-center justify-start w-full">
            <button
              onClick={() => setSelectedTaskId(task.id)}
              className={cn(
                "p-1.5 rounded transition-colors",
                hasNote
                  ? "text-blue-500 bg-blue-500/10 hover:bg-blue-500/20"
                  : "text-[#808191] hover:bg-[#252836] hover:text-blue-400"
              )}
              title={hasNote ? "Notu Görüntüle" : "Not Ekle"}
            >
              <MessageSquare size={16} fill={hasNote ? "currentColor" : "none"} />
            </button>
          </div>
        )
      default:
        return <div className="w-full" />
    }
  }

  return (
    <>
      <div className={cn(
        'flex items-stretch border-b border-[#1D1F2B] transition-colors group/row bg-[#0F111A] relative',
        'hover:bg-[#1D1F2B]',
        expanded && 'bg-[#131520]'
      )}>
        {/* Renk şeridi */}
        <div
          className="shrink-0 transition-opacity"
          style={{ width: STRIPE_W, background: groupColor, opacity: expanded ? 1 : 0 }}
        />

        {/* Checkbox */}
        <div className="flex items-center justify-center shrink-0" style={{ width: CHECKBOX_W }}>
          <input
            type="checkbox"
            className="accent-blue-600 cursor-pointer opacity-0 group-hover/row:opacity-100 transition-opacity"
          />
        </div>

        <div
          className="flex items-center gap-2 shrink-0 px-4 py-3 border-r-[4px] border-[#0F111A]"
          style={{ width: visibleCols.find((c) => c.id === 'title')?.width ?? 300 }}
        >
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-0.5 rounded hover:bg-white/80 shrink-0 transition-all"
          >
            <ChevronRight size={13} className={cn('text-gray-400 transition-transform', expanded && 'rotate-90')} />
          </button>

          {editingTitle ? (
            <input
              autoFocus value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => e.key === 'Enter' && commitTitle()}
              maxLength={255}
              className="flex-1 outline-none text-sm bg-[#1A1F36] text-white border border-blue-500 rounded px-2 py-0.5 shadow-sm"
            />
          ) : (
            <span
              onDoubleClick={() => setEditingTitle(true)}
              onClick={() => setSelectedTaskId(task.id)}
              className="flex-1 text-sm text-gray-200 truncate font-medium cursor-pointer hover:text-blue-400 transition-colors"
            >
              {task.title}
            </span>
          )}

          <button
            onClick={() => setEditingTitle(true)}
            className="shrink-0 text-gray-300 hover:text-blue-500 opacity-0 group-hover/row:opacity-100 transition-all"
          >
            <Pencil size={11} />
          </button>

          <button
            onClick={handleDelete}
            className="shrink-0 text-gray-300 hover:text-red-500 opacity-20 group-hover/row:opacity-100 transition-all"
          >
            <Trash2 size={11} />
          </button>

          {hasSubtasks && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="shrink-0 text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full leading-none"
              style={{ background: groupColor }}
            >
              {subtasks.length}
            </button>
          )}
        </div>

        {/* Dinamik sütunlar (title hariç) */}
        {visibleCols.filter((c) => c.id !== 'title').map((col) => (
          <div
            key={col.id}
            style={{ width: col.width }}
            className={cn(
              "shrink-0 flex items-stretch border-r-[1px] border-solid border-gray-600",
              (col.id === 'status' || col.id === 'priority') ? "" : "py-3 px-4"
            )}
          >
            {renderCell(col)}
          </div>
        ))}

        {/* Sağ simetri barı */}
        <div style={{ width: STRIPE_W }} className="shrink-0 bg-transparent" />
      </div>

      {expanded && (
        <>
          {subtasks.map((sub, i) => (
            <SubTaskRow key={sub.id} task={sub} isLast={i === subtasks.length - 1 && !addingSubtask} />
          ))}

          {/* Alt görev ekle alan çizgileri */}
          <div
            className="flex items-stretch border-b border-[#1D1F2B] bg-[#0F111A]"
          >
            {/* stripe */}
            <div style={{ width: STRIPE_W, background: groupColor, opacity: 0.3 }} className="shrink-0" />
            {/* connector */}
            <div className="relative shrink-0" style={{ width: CHECKBOX_W }}>
              <div className="absolute left-[50%] top-0 h-[50%] w-px bg-[#1D1F2B]" />
              <div className="absolute left-[50%] top-[50%] h-px bg-[#1D1F2B]" style={{ width: '50%' }} />
            </div>

            {addingSubtask ? (
              <div className="flex items-center gap-2 flex-1 pl-3 pr-4 py-2.5">
                <input
                  autoFocus
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addSubtask()
                    if (e.key === 'Escape') { setAddingSubtask(false); setSubTitle('') }
                  }}
                  onBlur={addSubtask}
                  maxLength={255}
                  placeholder="Subitem title..."
                  className="flex-1 text-xs outline-none border-b-2 border-indigo-500 py-0.5 bg-transparent placeholder:text-[#808191] text-white"
                />
              </div>
            ) : (
              <button
                onClick={() => setAddingSubtask(true)}
                className="flex items-center gap-1.5 pl-3 pr-4 py-3 text-xs text-[#808191] hover:text-white hover:bg-[#1D1F2B] transition-colors w-full"
              >
                <Plus size={12} />
                Add subitem
              </button>
            )}
          </div>
        </>
      )}
    </>
  )
}
