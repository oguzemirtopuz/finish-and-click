import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface Props {
  workspaceId: string
  onClose: () => void
}

export function InviteModal({ workspaceId, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc('invite_user_by_email', {
        p_workspace_id: workspaceId,
        p_email: email
      })

      if (error) throw error

      // Automatically set workspace type to 'shared' (if personal)
      const { data: wsData } = await supabase.from('workspaces').select('type').eq('id', workspaceId).single()
      if (wsData?.type === 'personal') {
        await supabase.from('workspaces').update({ type: 'shared' }).eq('id', workspaceId)
      }

      toast.success(data?.message || 'User invited')
      setTimeout(() => onClose(), 1500)
    } catch (err: any) {
      toast.error(err.message || 'Could not invite.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Invite to Workspace</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleInvite} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 ml-1">User Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="w-full text-sm text-gray-900 outline-none border border-gray-200 rounded-lg px-3 py-2.5 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-shadow"
            />
            <p className="text-[11px] text-gray-400 mt-1.5 ml-1">If the user is registered, they will be added directly, otherwise the invitation is put on hold.</p>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !email}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : <><Send size={14}/> Send Invite</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
