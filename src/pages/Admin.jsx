import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'erles@gyhe.de'

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vereine, setVereine] = useState([])
  const [allLinks, setAllLinks] = useState([])
  const [laden, setLaden] = useState(true)
  const [generatingFor, setGeneratingFor] = useState(null)
  const [newLink, setNewLink] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (!user) return
    if (user.email !== ADMIN_EMAIL) { navigate('/'); return }
    ladeData()
  }, [user])

  async function getJwt() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function ladeData() {
    const jwt = await getJwt()
    const res = await fetch('/api/admin-get-data', {
      headers: { Authorization: `Bearer ${jwt}` },
    })
    const data = await res.json()
    if (data.vereine) setVereine(data.vereine)
    if (data.links) setAllLinks(data.links)
    setLaden(false)
  }

  async function createLink(clubId) {
    const key = clubId || 'demo'
    setGeneratingFor(key)
    const jwt = await getJwt()
    const res = await fetch('/api/admin-create-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ clubId: clubId || null }),
    })
    const data = await res.json()
    if (data.token) {
      setNewLink({ token: data.token, clubId: clubId || null })
      await ladeData()
    }
    setGeneratingFor(null)
  }

  function getLinkUrl(token) {
    return `${window.location.origin}/einladung/${token}`
  }

  async function copyLink(token) {
    await navigator.clipboard.writeText(getLinkUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  if (laden) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin</h1>

      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Demo-Link erstellen</h2>
            <p className="text-sm text-gray-400 mt-0.5">Kein Verein zugeordnet — für Kundenakquise / Demo</p>
          </div>
          <button onClick={() => createLink(null)} disabled={generatingFor === 'demo'} className="btn-primary text-sm">
            {generatingFor === 'demo' ? 'Wird erstellt…' : '+ Demo-Link'}
          </button>
        </div>
        {newLink && !newLink.clubId && (
          <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3">
            <p className="text-xs font-mono text-green-800 flex-1 truncate">{getLinkUrl(newLink.token)}</p>
            <button onClick={() => copyLink(newLink.token)} className="btn-secondary text-xs flex-shrink-0">
              {copied === newLink.token ? '✓ Kopiert' : 'Kopieren'}
            </button>
          </div>
        )}
      </div>

      <h2 className="font-semibold text-gray-900 mb-3">Vereinslizenzen ({vereine.length})</h2>

      {vereine.length === 0 ? (
        <div className="card text-center py-8 text-gray-400 text-sm">Noch keine aktiven Vereinslizenzen</div>
      ) : (
        <div className="space-y-4">
          {vereine.map((v) => {
            const vereinsLinks = allLinks.filter((l) => l.club_id === v.user_id)
            const frei = vereinsLinks.filter((l) => !l.used).length
            return (
              <div key={v.user_id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-semibold text-gray-900">{v.profile?.club_name || v.profile?.full_name || '—'}</p>
                    {v.profile?.club_name && <p className="text-sm text-gray-500">{v.profile.full_name}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{frei} von {vereinsLinks.length} Links frei</p>
                  </div>
                  <button onClick={() => createLink(v.user_id)} disabled={generatingFor === v.user_id}
                    className="btn-secondary text-xs">
                    {generatingFor === v.user_id ? 'Wird erstellt…' : '+ Link erstellen'}
                  </button>
                </div>

                {newLink?.clubId === v.user_id && (
                  <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3">
                    <p className="text-xs font-mono text-green-800 flex-1 truncate">{getLinkUrl(newLink.token)}</p>
                    <button onClick={() => copyLink(newLink.token)} className="btn-secondary text-xs flex-shrink-0">
                      {copied === newLink.token ? '✓ Kopiert' : 'Kopieren'}
                    </button>
                  </div>
                )}

                <div className="space-y-1.5">
                  {vereinsLinks.map((link) => (
                    <div key={link.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs ${link.used ? 'bg-gray-50' : 'bg-green-50'}`}>
                      <span className={`w-4 text-center font-bold ${link.used ? 'text-gray-400' : 'text-green-600'}`}>
                        {link.used ? '✓' : '○'}
                      </span>
                      <span className="font-mono text-gray-500 flex-1 truncate">{link.token.slice(0, 16)}…</span>
                      {link.created_by === 'admin' && (
                        <span className="text-blue-500 font-semibold">Admin</span>
                      )}
                      {link.used_at && (
                        <span className="text-gray-400">{new Date(link.used_at).toLocaleDateString('de-DE')}</span>
                      )}
                      {!link.used && (
                        <button onClick={() => copyLink(link.token)}
                          className="text-gray-500 hover:text-gray-900 transition-colors font-medium">
                          {copied === link.token ? '✓' : 'Kopieren'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
