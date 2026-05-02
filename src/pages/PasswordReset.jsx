import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PasswordReset() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase setzt die Session automatisch aus dem URL-Hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }
    if (password.length < 6) {
      setError('Das Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError('Fehler beim Speichern. Bitte fordere einen neuen Link an.')
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/spiele'), 2500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KickMatch" className="w-12 h-12 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Neues Passwort</h1>
          <p className="text-sm text-gray-500 mt-1">Gib dein neues Passwort ein</p>
        </div>

        {success ? (
          <div className="card text-center space-y-4">
            <p className="text-2xl">✅</p>
            <p className="text-sm font-semibold text-gray-900">Passwort wurde geändert</p>
            <p className="text-sm text-gray-500">Du wirst weitergeleitet…</p>
          </div>
        ) : !ready ? (
          <div className="card text-center space-y-3">
            <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Link wird überprüft…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}
            <div>
              <label className="label">Neues Passwort</label>
              <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mindestens 6 Zeichen" autoFocus />
            </div>
            <div>
              <label className="label">Passwort bestätigen</label>
              <input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Wird gespeichert…' : 'Passwort speichern'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
