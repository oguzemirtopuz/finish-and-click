/**
 * Supabase'e başlangıç verisi ekler.
 * Tarayıcı konsolunda: import('/src/lib/seed.ts').then(m => m.seed())
 *
 * Kesin şema:
 *   tasks      → id, group_id, parent_id, title, status, priority, assignee,
 *                start_date, end_date, rating, numeric_value, progress, order
 *   task_groups → id, workspace_id, name, color, order, collapsed
 *   workspaces  → id, name, type, owner_id, created_at
 */
import { supabase } from './supabase'

export async function seed() {
  console.log('🌱 Seed başlıyor...')

  // ── 1. Workspace ────────────────────────────────────────────
  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({ name: 'Ana Çalışma Alanı', type: 'personal' })
    .select()
    .single()
  if (wsErr) { console.error('❌ workspace:', wsErr.message); return }
  console.log('✅ Workspace:', ws.id)

  // ── 2. Gruplar ──────────────────────────────────────────────
  const { data: groups, error: gErr } = await supabase
    .from('task_groups')
    .insert([
      { workspace_id: ws.id, name: 'Bu Haftaki İşler', color: '#0073ea', order: 0, collapsed: false },
      { workspace_id: ws.id, name: 'Gelecek Planları',  color: '#00c875', order: 1, collapsed: false },
    ])
    .select()
  if (gErr) { console.error('❌ task_groups:', gErr.message); return }
  console.log('✅ Gruplar:', groups.length)

  const g1 = groups[0]
  const g2 = groups[1]

  // ── 3. Ana görevler ─────────────────────────────────────────
  const { data: tasks, error: tErr } = await supabase
    .from('tasks')
    .insert([
      // — Grup 1
      {
        group_id: g1.id,
        parent_id: null,
        title: 'Landing page yenile',
        status: 'in_progress',
        priority: 'high',
        assignee: 'Ali',
        start_date: '2026-04-07',
        end_date: '2026-04-11',
        rating: 4,
        numeric_value: 8,
        progress: 66,
        order: 0,
      },
      {
        group_id: g1.id,
        parent_id: null,
        title: 'API entegrasyonu yaz',
        status: 'todo',
        priority: 'medium',
        assignee: 'Ayşe',
        start_date: '2026-04-08',
        end_date: '2026-04-12',
        rating: 3,
        numeric_value: 5,
        progress: 0,
        order: 1,
      },
      {
        group_id: g1.id,
        parent_id: null,
        title: 'Testleri tamamla',
        status: 'stuck',
        priority: 'critical',
        assignee: 'Mehmet',
        start_date: '2026-04-05',
        end_date: '2026-04-09',
        rating: 2,
        numeric_value: 3,
        progress: 33,
        order: 2,
      },
      // — Grup 2
      {
        group_id: g2.id,
        parent_id: null,
        title: 'Mobil uygulama tasarımı',
        status: 'todo',
        priority: 'high',
        assignee: 'Zeynep',
        start_date: '2026-04-14',
        end_date: '2026-04-25',
        rating: 5,
        numeric_value: 12,
        progress: 0,
        order: 0,
      },
      {
        group_id: g2.id,
        parent_id: null,
        title: 'SEO iyileştirme',
        status: 'waiting',
        priority: 'low',
        assignee: 'Ali',
        start_date: '2026-04-20',
        end_date: '2026-04-30',
        rating: 3,
        numeric_value: 6,
        progress: 0,
        order: 1,
      },
    ])
    .select()
  if (tErr) { console.error('❌ tasks:', tErr.message); return }
  console.log('✅ Görevler:', tasks.length)

  // ── 4. Alt görevler (parent: "Landing page yenile") ─────────
  const parent = tasks[0]
  const { error: subErr } = await supabase.from('tasks').insert([
    {
      group_id: g1.id,
      parent_id: parent.id,
      title: 'Hero section tasarla',
      status: 'done',
      priority: 'medium',
      assignee: 'Ali',
      start_date: '2026-04-07',
      end_date: '2026-04-08',
      rating: 5,
      numeric_value: 3,
      progress: 100,
      order: 0,
    },
    {
      group_id: g1.id,
      parent_id: parent.id,
      title: 'Mobil uyum sağla',
      status: 'done',
      priority: 'medium',
      assignee: 'Ali',
      start_date: '2026-04-08',
      end_date: '2026-04-09',
      rating: 4,
      numeric_value: 2,
      progress: 100,
      order: 1,
    },
    {
      group_id: g1.id,
      parent_id: parent.id,
      title: 'SEO meta etiketleri',
      status: 'in_progress',
      priority: 'low',
      assignee: 'Ayşe',
      start_date: '2026-04-09',
      end_date: '2026-04-11',
      rating: 3,
      numeric_value: 2,
      progress: 0,
      order: 2,
    },
  ])
  if (subErr) { console.error('❌ subtasks:', subErr.message); return }
  console.log('✅ Alt görevler eklendi.')

  console.log('🎉 Seed tamamlandı! Sayfayı yenile.')
}
