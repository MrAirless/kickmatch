import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rolle, setRolle] = useState('trainer')
  const [privacy, setPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const rollenOptionen = [
    { val: 'trainer', label: '⚽ Trainer', desc: 'Spiele anbieten & anfragen' },
    { val: 'schiedsrichter', label: '🟡 Schiedsrichter', desc: 'Spiele pfeifen & Einsätze finden' },
  ]

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen lang sein.'); return }
    if (!privacy) { setError('Bitte akzeptiere die Datenschutzerklärung.'); return }
    setLoading(true)
    const { error } = await signUp(email, password, fullName, rolle)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/spiele')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KickMatch" className="w-12 h-12 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Registrieren</h1>
          <p className="text-sm text-gray-500 mt-1">Konto erstellen und Gegner finden</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

          {/* Rollenauswahl */}
          <div>
            <label className="label">Ich bin…</label>
            <div className="grid grid-cols-2 gap-2">
              {rollenOptionen.map((r) => (
                <button
                  key={r.val}
                  type="button"
                  onClick={() => setRolle(r.val)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    rolle === r.val
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-base mb-0.5">{r.label.split(' ')[0]}</div>
                  <div className={`text-xs font-semibold ${rolle === r.val ? 'text-brand-800' : 'text-gray-600'}`}>
                    {r.label.split(' ').slice(1).join(' ')}
                  </div>
                  <div className={`text-xs mt-0.5 ${rolle === r.val ? 'text-brand-600' : 'text-gray-400'}`}>
                    {r.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

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
            <input
              type="checkbox"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-brand-600 flex-shrink-0"
            />
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
