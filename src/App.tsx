import { useEffect, useState } from 'react'
// Vercel Deploy Trigger v6
import { useBoard } from './hooks/useBoard'
import { Navbar } from './components/board/Navbar'
import { BoardView } from './components/board/BoardView'
import { Auth } from './components/auth/Auth'
import { supabase } from './lib/supabase'
import { Sidebar } from './components/board/Sidebar'
import { Toaster } from 'sonner'

function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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
      <div className="hidden md:block h-full">
        <Sidebar  />
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
