import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'erles@gyhe.de'

const PLAN_LABELS = {
  einzellizenz: { label: 'Einzellizenz', bg: '#EAF3DE', color: '#27500A' },
  vereinslizenz: { label: 'Vereinslizenz', bg: '#E8F8F2', color: '#0C4D38' },
  individuell: { label: 'Individuell', bg: '#FFFBE6', color: '#7A5C00' },
  kein: { label: 'Kein Abo', bg: '#F1EFE8', color: '#6B6B68' },
}

function PlanBadge({ plan }) {
  const p = PLAN_LABELS[plan] || PLAN_LABELS.kein
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: p.bg, color: p.color }}>
      {p.label}
    </span>
  )
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Admin() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('nutzer')

  // Nutzer-Tab
  const [users, setUsers] = useState([])
  const [ladenUsers, setLadenUsers] = useState(true)
  const [suche, setSuche] = useState('')
  const [planFilter, setPlanFilter] = useState('alle')
  const [savingId, setSavingId] = useState(null)
  const [pendingPlans, setPendingPlans] = useState({})

  // Links-Tab (bestehend)
  const [vereine, setVereine] = useState([])
  const [allLinks, setAllLinks] = useState([])
  const [ladenLinks, setLadenLinks] = useState(true)
  const [generatingFor, setGeneratingFor] = useState(null)
  const [newLink, setNewLink] = useState(null)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (!user) return
    if (user.email !== ADMIN_EMAIL) { navigate('/'); return }
    ladeUsers()
    ladeLinks()
  }, [user])

  async function getJwt() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }

  async function ladeUsers() {
    setLadenUsers(true)
    try {
      const jwt = await getJwt()
      const res = await fetch('/api/admin-get-users', { headers: { Authorization: `Bearer ${jwt}` } })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error('ladeUsers error:', err)
    }
    setLadenUsers(false)
  }

  async function ladeLinks() {
    setLadenLinks(true)
    try {
      const jwt = await getJwt()
      const res = await fetch('/api/admin-get-data', { headers: { Authorization: `Bearer ${jwt}` } })
      if (res.ok) {
        const data = await res.json()
        if (data.vereine) setVereine(data.vereine)
        if (data.links) setAllLinks(data.links)
      }
    } catch (err) {
      console.error('ladeLinks error:', err)
    }
    setLadenLinks(false)
  }

  async function saveLicense(userId) {
    const plan = pendingPlans[userId]
    if (!plan) return
    setSavingId(userId)
    try {
      const jwt = await getJwt()
      const res = await fetch('/api/admin-set-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ userId, plan }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId
          ? { ...u, subscription: plan === 'kein' ? null : { plan, status: 'active' } }
          : u
        ))
        setPendingPlans(prev => { const n = { ...prev }; delete n[userId]; return n })
      } else {
        alert('Fehler beim Speichern')
      }
    } catch (err) {
      alert('Fehler: ' + err.message)
    }
    setSavingId(null)
  }

  async function createLink(clubId) {
    const key = clubId || 'demo'
    setGeneratingFor(key)
    try {
      const jwt = await getJwt()
      const res = await fetch('/api/admin-create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ clubId: clubId || null }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.token) { setNewLink({ token: data.token, clubId: clubId || null }); await ladeLinks() }
      }
    } catch (err) { console.error(err) }
    setGeneratingFor(null)
  }

  function getLinkUrl(token) { return `${window.location.origin}/einladung/${token}` }
  async function copyLink(token) {
    await navigator.clipboard.writeText(getLinkUrl(token))
    setCopied(token); setTimeout(() => setCopied(null), 2000)
  }

  const gefiltert = users.filter(u => {
    const q = suche.toLowerCase()
    const matchSuche = !q || u.email?.toLowerCase().includes(q)
      || u.profile?.full_name?.toLowerCase().includes(q)
      || u.profile?.club_name?.toLowerCase().includes(q)
    const currentPlan = u.subscription?.plan || 'kein'
    const matchPlan = planFilter === 'alle' || currentPlan === planFilter
    return matchSuche && matchPlan
  })

  const stats = {
    gesamt: users.length,
    trainer: users.filter(u => u.rolle !== 'schiedsrichter').length,
    schiri: users.filter(u => u.rolle === 'schiedsrichter').length,
    einzellizenz: users.filter(u => u.subscription?.plan === 'einzellizenz').length,
    vereinslizenz: users.filter(u => u.subscription?.plan === 'vereinslizenz').length,
    individuell: users.filter(u => u.subscription?.plan === 'individuell').length,
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {[{ val: 'nutzer', label: 'Nutzer' }, { val: 'links', label: 'Einladungslinks' }].map(t => (
          <button key={t.val} onClick={() => setActiveTab(t.val)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${activeTab === t.val ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'nutzer' && (
        ladenUsers ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Nutzer gesamt" value={stats.gesamt} />
              <StatCard label="Trainer" value={stats.trainer} />
              <StatCard label="Schiedsrichter" value={stats.schiri} />
              <StatCard label="Einzellizenz" value={stats.einzellizenz} />
              <StatCard label="Vereinslizenz" value={stats.vereinslizenz} />
              <StatCard label="Individuell" value={stats.individuell} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Suche nach Name, E-Mail oder Verein…"
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                className="input flex-1"
              />
              <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="input sm:w-44">
                <option value="alle">Alle Pläne</option>
                <option value="kein">Kein Abo</option>
                <option value="einzellizenz">Einzellizenz</option>
                <option value="vereinslizenz">Vereinslizenz</option>
                <option value="individuell">Individuell</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">{gefiltert.length} Nutzer</span>
                <button onClick={ladeUsers} className="text-xs text-brand-600 hover:underline">↻ Aktualisieren</button>
              </div>
              {gefiltert.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">Keine Nutzer gefunden</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {gefiltert.map(u => {
                    const currentPlan = u.subscription?.plan || 'kein'
                    const pending = pendingPlans[u.id]
                    const changed = pending !== undefined && pending !== currentPlan
                    return (
                      <div key={u.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {u.profile?.full_name || u.email}
                            </p>
                            <PlanBadge plan={currentPlan} />
                            {u.rolle === 'schiedsrichter' && (
                              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-medium">🟡 Schiri</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {u.email}{u.profile?.club_name ? ` · ${u.profile.club_name}` : ''}
                          </p>
                          <p className="text-xs text-gray-300 mt-0.5">
                            Registriert: {new Date(u.created_at).toLocaleDateString('de-DE')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={pending !== undefined ? pending : currentPlan}
                            onChange={(e) => setPendingPlans(prev => ({ ...prev, [u.id]: e.target.value }))}
                            className="input text-xs py-1.5 w-36"
                          >
                            <option value="kein">Kein Abo</option>
                            <option value="einzellizenz">Einzellizenz</option>
                            <option value="vereinslizenz">Vereinslizenz</option>
                            <option value="individuell">Individuell</option>
                          </select>
                          {changed && (
                            <button
                              onClick={() => saveLicense(u.id)}
                              disabled={savingId === u.id}
                              className="btn-primary text-xs py-1.5 px-3"
                            >
                              {savingId === u.id ? '…' : 'Speichern'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      )}

      {activeTab === 'links' && (
        ladenLinks ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="card">
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

            <h2 className="font-semibold text-gray-900">Vereinslizenzen ({vereine.length})</h2>
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
                        <button onClick={() => createLink(v.user_id)} disabled={generatingFor === v.user_id} className="btn-secondary text-xs">
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
                          <div key={link.id} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${link.used ? 'bg-gray-50' : 'bg-green-50'}`}>
                            <span className={`w-4 text-center font-bold ${link.used ? 'text-gray-400' : 'text-green-600'}`}>{link.used ? '✓' : '○'}</span>
                            <span className="font-mono text-gray-500 flex-1 truncate">{link.token.slice(0, 16)}…</span>
                            {link.used_at && <span className="text-gray-400">{new Date(link.used_at).toLocaleDateString('de-DE')}</span>}
                            {!link.used && (
                              <button onClick={() => copyLink(link.token)} className="text-gray-500 hover:text-gray-900 transition-colors font-medium">
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
      )}
    </div>
  )
}
