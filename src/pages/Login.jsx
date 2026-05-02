import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [resetMode, setResetMode] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('E-Mail oder Passwort falsch.')
    } else {
      navigate(location.state?.from || '/spiele')
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setResetError('')
    setResetLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/passwort-reset`,
    })
    setResetLoading(false)
    if (error) {
      setResetError('Fehler beim Senden. Bitte prüfe die E-Mail-Adresse.')
    } else {
      setResetSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KickMatch" className="w-12 h-12 rounded-xl mx-auto mb-4" />
          {resetMode ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Passwort zurücksetzen</h1>
              <p className="text-sm text-gray-500 mt-1">Wir senden dir einen Link per E-Mail</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Anmelden</h1>
              <p className="text-sm text-gray-500 mt-1">Willkommen zurück bei KickMatch</p>
            </>
          )}
        </div>

        {resetMode ? (
          resetSent ? (
            <div className="card text-center space-y-4">
              <p className="text-2xl">📬</p>
              <p className="text-sm font-semibold text-gray-900">E-Mail wurde gesendet</p>
              <p className="text-sm text-gray-500">Klicke auf den Link in der E-Mail, um dein Passwort zurückzusetzen.</p>
              <button onClick={() => { setResetMode(false); setResetSent(false) }} className="btn-secondary w-full justify-center">
                Zurück zur Anmeldung
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="card space-y-4">
              {resetError && (
                <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{resetError}</div>
              )}
              <div>
                <label className="label">E-Mail</label>
                <input type="email" className="input" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required placeholder="trainer@verein.de" autoFocus />
              </div>
              <button type="submit" disabled={resetLoading} className="btn-primary w-full justify-center">
                {resetLoading ? 'Wird gesendet…' : 'Link senden'}
              </button>
              <button type="button" onClick={() => setResetMode(false)} className="btn-ghost w-full justify-center text-sm">
                Abbrechen
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}
            <div>
              <label className="label">E-Mail</label>
              <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="trainer@verein.de" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Passwort</label>
                <button type="button" onClick={() => { setResetMode(true); setResetEmail(email) }} className="text-xs text-brand-600 hover:underline">
                  Passwort vergessen?
                </button>
              </div>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Wird angemeldet…' : 'Anmelden'}
            </button>
          </form>
        )}

        {!resetMode && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Noch kein Konto?{' '}
            <Link to="/register" className="text-brand-600 font-medium hover:underline">Registrieren</Link>
          </p>
        )}
      </div>
    </div>
  )
}
