import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { LayoutGrid } from 'lucide-react'

export function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('Registration successful! Please log in (Login permitted assuming email verification is disabled).')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#1A1F36]">
      <div className="w-full max-w-md bg-[#141829] p-8 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-[#2C334A]">
        <div className="flex items-center gap-3 mb-10 justify-center">
          <LayoutGrid size={32} className="text-blue-500" />
          <span className="text-white font-bold text-3xl tracking-tight">Work OS</span>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-white mb-8">
          {isLogin ? 'Log into your account' : 'Create a new account'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 text-red-400 text-sm rounded-lg border border-red-900/50">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 mb-1.5 ml-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-[15px] outline-none border border-[#2C334A] bg-[#20263c] text-white rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow placeholder:text-gray-500"
              placeholder="name@company.com"
            />
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-gray-400 mb-1.5 ml-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-[15px] outline-none border border-[#2C334A] bg-[#20263c] text-white rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow placeholder:text-gray-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[15px] py-3 rounded-lg transition-colors mt-2 disabled:bg-blue-800 disabled:text-gray-400"
          >
            {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[15px] text-gray-400 hover:text-white transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up now." : "Already have an account? Log in."}
          </button>
        </div>
      </div>
    </div>
  )
}
