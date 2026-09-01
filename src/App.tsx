import { useEffect, useState } from 'react'
// Vercel Deploy Trigger v6
import { useBoard } from './hooks/useBoard'
import { Navbar } from './components/board/Navbar'
import { BoardView } from './components/board/BoardView'
import { Auth } from './components/auth/Auth'
import { supabase } from './lib/supabase'
import { Sidebar } from './components/board/Sidebar'
import { Toaster } from 'sonner'
import { useBoardStore } from './lib/store'
import { X } from 'lucide-react'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { isMobileSidebarOpen, setMobileSidebarOpen } = useBoardStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Once authenticated, start fetching board data
  useBoard()

  if (loading) {
    return <div className="h-screen w-screen bg-[#0F111A] flex items-center justify-center text-[#808191] text-sm">Loading...</div>
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div className="flex h-screen w-screen text-white font-['Inter'] overflow-hidden" style={{ background: '#181b34' }}>
      <Toaster theme="dark" position="top-right" />

      {/* Masaüstü sidebar — sadece md ve üzeri ekranlarda */}
      <div className="hidden md:block h-full">
        <Sidebar  />
      </div>

      {/* Mobil sidebar drawer — sadece md altı ekranlarda */}
      {/* Karartma overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isMobileSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileSidebarOpen(false)}
      />
      {/* Kayar panel */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#282f4c' }}
      >
        {/* Kapatma butonu */}
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="absolute top-4 right-3 p-1.5 rounded-lg hover:bg-white/10 text-[#a9abcd] cursor-pointer z-10"
          aria-label="Menüyü kapat"
        >
          <X size={20} />
        </button>
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative" style={{ background: '#181b34' }}>
        <Navbar />
        <main style={{ flex: 1, overflow: 'auto' }}>
          <BoardView />
        </main>
      </div>
    </div>
  )
}

export default App

