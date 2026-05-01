import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Einladung() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [invite, setInvite] = useState(null)
  const [clubProfile, setClubProfile] = useState(null)
  const [status, setStatus] = useState('loading') // loading | valid | invalid | used

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [privacy, setPrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function checkToken() {
      const { data, error } = await supabase
        .from('invite_links')
        .select('*')
        .eq('token', token)
        .single()

      if (error || !data) { setStatus('invalid'); return }
      if (data.used) { setStatus('used'); return }

      setInvite(data)

      if (data.club_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, club_name')
          .eq('id', data.club_id)
          .single()
        setClubProfile(profile)
      }

      setStatus('valid')
    }
    checkToken()
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen lang sein.'); return }
    if (!privacy) { setError('Bitte akzeptiere die Datenschutzerklärung.'); return }
    setLoading(true)

    const { data, error: signUpError } = await signUp(email, password, fullName, 'trainer')
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    await fetch('/api/redeem-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId: data.user.id }),
    })

    setLoading(false)
    navigate('/spiele')
  }

  if (status === 'loading') return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (status === 'invalid') return (
    <div className="max-w-sm mx-auto px-4 py-20 text-center">
      <p className="text-5xl mb-4">❌</p>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Ungültiger Link</h1>
      <p className="text-gray-500 text-sm">Dieser Einladungslink existiert nicht oder ist abgelaufen.</p>
    </div>
  )

  if (status === 'used') return (
    <div className="max-w-sm mx-auto px-4 py-20 text-center">
      <p className="text-5xl mb-4">🔒</p>
      <h1 className="text-xl font-bold text-gray-900 mb-2">Link bereits verwendet</h1>
      <p className="text-gray-500 text-sm mb-6">Dieser Einladungslink wurde bereits eingelöst.</p>
      <Link to="/login" className="btn-primary">Zum Login</Link>
    </div>
  )

  const vereinName = clubProfile?.club_name || clubProfile?.full_name

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KickMatch" className="w-12 h-12 rounded-xl mx-auto mb-4" />
          {vereinName ? (
            <>
              <p className="text-sm text-gray-500 mb-1">Du wurdest eingeladen von</p>
              <h1 className="text-2xl font-bold text-gray-900">{vereinName}</h1>
              <p className="text-sm text-gray-500 mt-1">Erstelle dein Konto und werde Teil des Vereins auf KickMatch</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">Willkommen bei KickMatch</h1>
              <p className="text-sm text-gray-500 mt-1">Erstelle dein kostenloses Demokonto</p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
          <div>
            <label className="label">Dein Name</label>
            <input type="text" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Max Mustermann" />
          </div>
          <div>
            <label className="label">E-Mail</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="trainer@verein.de" />
          </div>
          <div>
            <label className="label">Passwort</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Mindestens 6 Zeichen" />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-600 flex-shrink-0" />
            <span className="text-sm text-gray-600">
              Ich habe die{' '}
              <Link to="/datenschutz" target="_blank" className="text-brand-600 hover:underline font-medium">Datenschutzerklärung</Link>{' '}
              gelesen und akzeptiere sie.
            </span>
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Wird registriert…' : 'Konto erstellen'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Bereits registriert?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">Anmelden</Link>
        </p>
      </div>
    </div>
  )
}
