import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Profile() {
  const { profile, user, subscription, refreshProfile } = useAuth()

  const [editing, setEditing] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalError, setPortalError] = useState('')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [clubName, setClubName] = useState(profile?.club_name || '')
  const [city, setCity] = useState(profile?.city || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [heimplatz, setHeimplatz] = useState(profile?.heimplatz || '')
  const [heimplatzAdresse, setHeimplatzAdresse] = useState(profile?.heimplatz_adresse || '')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleManageSubscription() {
    setPortalLoading(true)
    setPortalError('')
    try {
      const res = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: subscription.stripe_customer_id }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch {
      setPortalError('Fehler beim Öffnen des Kundenportals.')
    }
    setPortalLoading(false)
  }

  function startEditing() {
    setFullName(profile?.full_name || '')
    setClubName(profile?.club_name || '')
    setCity(profile?.city || '')
    setPhone(profile?.phone || '')
    setHeimplatz(profile?.heimplatz || '')
    setHeimplatzAdresse(profile?.heimplatz_adresse || '')
    setEditing(true)
    setSuccess(false)
    setError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, club_name: clubName, city, phone, heimplatz, heimplatz_adresse: heimplatzAdresse })
      .eq('id', user.id)
    setLoading(false)
    if (error) {
      setError('Fehler beim Speichern.')
    } else {
      await refreshProfile()
      setEditing(false)
      setSuccess(true)
    }
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Mein Profil</h1>

      {success && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
          Profil erfolgreich gespeichert.
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-brand-600 text-xl font-bold">{initials}</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-lg">{profile?.full_name || '—'}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}
            <div>
              <label className="label">Name</label>
              <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Vereinsname</label>
              <input type="text" className="input" value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="z.B. FC Musterhausen" />
            </div>
            <div>
              <label className="label">Stadt</label>
              <input type="text" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="z.B. Stuttgart" />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="z.B. 0171 1234567" />
            </div>
            <div className="pt-2 pb-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Heimplatz</p>
              <div className="space-y-3">
                <div>
                  <label className="label">Platzname</label>
                  <input type="text" className="input" value={heimplatz} onChange={(e) => setHeimplatz(e.target.value)} placeholder="z.B. Sportpark Nord" />
                </div>
                <div>
                  <label className="label">Adresse</label>
                  <input type="text" className="input" value={heimplatzAdresse} onChange={(e) => setHeimplatzAdresse(e.target.value)} placeholder="Musterstr. 1, 68159 Mannheim" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Wird gespeichert…' : 'Speichern'}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary">
                Abbrechen
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Verein</span>
                <span className="font-medium text-gray-900">{profile?.club_name || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stadt</span>
                <span className="font-medium text-gray-900">{profile?.city || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Telefon</span>
                <span className="font-medium text-gray-900">{profile?.phone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">E-Mail</span>
                <span className="font-medium text-gray-900">{user?.email}</span>
              </div>
              {(profile?.heimplatz || profile?.heimplatz_adresse) && (
                <>
                  <div className="pt-3 pb-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Heimplatz</p>
                  </div>
                  {profile?.heimplatz && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Platz</span>
                      <span className="font-medium text-gray-900">{profile.heimplatz}</span>
                    </div>
                  )}
                  {profile?.heimplatz_adresse && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Adresse</span>
                      <span className="font-medium text-gray-900">{profile.heimplatz_adresse}</span>
                    </div>
                  )}
                </>
              )}
            </div>
            <button onClick={startEditing} className="btn-secondary text-sm mt-6 w-full">
              Profil bearbeiten
            </button>
          </>
        )}
      </div>

      {subscription?.plan === 'vereinslizenz' && (
        <div className="card mt-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Vereinsportal</h2>
              <p className="text-sm text-gray-400 mt-0.5">Einladungslinks & Mitglieder verwalten</p>
            </div>
            <Link to="/vereinsportal" className="btn-primary text-sm">Öffnen →</Link>
          </div>
        </div>
      )}

      {user?.email === 'erles@gyhe.de' && (
        <div className="card mt-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">Admin</h2>
              <p className="text-sm text-gray-400 mt-0.5">Links erstellen & Vereine verwalten</p>
            </div>
            <Link to="/admin" className="btn-secondary text-sm">Öffnen →</Link>
          </div>
        </div>
      )}

      <div className="card mt-5">
        <h2 className="font-semibold text-gray-900 mb-4">Mein Abo</h2>
        {subscription ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Plan</span>
              <span className="font-medium text-gray-900 capitalize">{subscription.plan}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-green-600">Aktiv</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nächste Abrechnung</span>
              <span className="font-medium text-gray-900">
                {new Date(subscription.current_period_end).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </div>
            {portalError && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{portalError}</div>
            )}
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="btn-secondary text-sm w-full mt-2"
            >
              {portalLoading ? 'Wird geladen…' : 'Abo verwalten (kündigen, Zahlungsmethode, Rechnungen)'}
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Plan</span>
              <span className="font-medium text-gray-900">Einzellizenz</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-green-600">Kostenlos aktiv</span>
            </div>
            <Link to="/preise" className="btn-secondary text-sm w-full mt-2 block text-center">
              Auf Vereinslizenz upgraden →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
