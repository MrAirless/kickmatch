import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError('E-Mail oder Passwort falsch.')
    } else {
      navigate('/spiele')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4 text-2xl">⚽</div>
          <h1 className="text-2xl font-bold text-gray-900">Anmelden</h1>
          <p className="text-sm text-gray-500 mt-1">Willkommen zurück bei KickMatch</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          <div>
            <label className="label">E-Mail</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="trainer@verein.de" />
          </div>
          <div>
            <label className="label">Passwort</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Wird angemeldet…' : 'Anmelden'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-brand-600 font-medium hover:underline">Registrieren</Link>
        </p>
      </div>
    </div>
  )
}
