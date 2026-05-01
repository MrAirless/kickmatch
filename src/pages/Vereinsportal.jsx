import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Vereinsportal() {
  const { user, subscription } = useAuth()
  const navigate = useNavigate()
  const [links, setLinks] = useState([])
  const [members, setMembers] = useState([])
  const [laden, setLaden] = useState(true)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (!user) return
    if (!subscription || subscription.plan !== 'vereinslizenz') {
      navigate('/profil')
      return
    }
    ladeData()
  }, [user, subscription])

  async function ladeData() {
    const [{ data: linkData }, { data: memberData }] = await Promise.all([
      supabase.from('invite_links').select('*').eq('club_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('full_name, phone, created_at').eq('club_id', user.id),
    ])
    if (linkData) setLinks(linkData)
    if (memberData) setMembers(memberData)
    setLaden(false)
  }

  function getLinkUrl(token) {
    return `${window.location.origin}/einladung/${token}`
  }

  async function copyLink(token) {
    await navigator.clipboard.writeText(getLinkUrl(token))
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  const freieLinks = links.filter((l) => !l.used)

  if (laden) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vereinsportal</h1>
        <Link to="/profil" className="text-sm text-gray-400 hover:text-gray-600">← Profil</Link>
      </div>

      <div className="card mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Einladungslinks</h2>
          <span className="text-sm text-gray-500">{freieLinks.length} von {links.length} verfügbar</span>
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Links werden nach dem Abo-Abschluss automatisch generiert.</p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div key={link.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${link.used ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${link.used ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                      {link.used ? 'Verwendet' : 'Verfügbar'}
                    </span>
                    {link.created_by === 'admin' && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-semibold">Extra</span>
                    )}
                  </div>
                  {!link.used && (
                    <p className="text-xs text-gray-400 font-mono truncate">{getLinkUrl(link.token)}</p>
                  )}
                  {link.used_at && (
                    <p className="text-xs text-gray-400">Eingelöst am {new Date(link.used_at).toLocaleDateString('de-DE')}</p>
                  )}
                </div>
                {!link.used && (
                  <button onClick={() => copyLink(link.token)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">
                    {copied === link.token ? '✓ Kopiert' : 'Kopieren'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {freieLinks.length === 0 && links.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800 font-medium">Alle Links aufgebraucht</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Für weitere Lizenzen bitte per{' '}
              <Link to="/kontakt" className="underline font-medium">Kontaktformular</Link>{' '}
              melden — wir finden eine Lösung.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 mb-4">Mitglieder ({members.length})</h2>
        {members.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            Noch keine Mitglieder. Teile deine Einladungslinks!
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.full_name}</p>
                  {m.phone && <p className="text-xs text-gray-400">{m.phone}</p>}
                </div>
                <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString('de-DE')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
