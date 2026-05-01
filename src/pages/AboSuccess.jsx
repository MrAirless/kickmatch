import { Link } from 'react-router-dom'

export default function AboSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M6 14l5.5 5.5L22 8.5" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Willkommen!</h1>
        <p className="text-gray-500 mb-8">Dein Abo ist aktiv. Du hast jetzt Zugriff auf alle Features.</p>
        <Link to="/spiele" className="btn-primary px-8 py-3">Zu den Spielen</Link>
      </div>
    </div>
  )
}
