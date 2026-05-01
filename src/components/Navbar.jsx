import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path) =>
    location.pathname === path ? 'text-brand-600 font-medium' : 'text-gray-500 hover:text-gray-900'

  async function handleSignOut() {
    await signOut()
    navigate('/')
    setMenuOpen(false)
  }

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

        <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-lg flex-shrink-0">⚽</div>
          <span className="font-semibold text-gray-900 text-sm">KickMatch</span>
        </Link>

        {user ? (
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/spiele" className={isActive('/spiele')}>Spiele</Link>
            <Link to="/preise" className={isActive('/preise')}>Preise</Link>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/preise" className={isActive('/preise')}>Preise</Link>
          </div>
        )}

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <>
              <Link to="/profil" className="btn-ghost text-sm">Profil</Link>
              <button onClick={handleSignOut} className="btn-secondary text-sm">Abmelden</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">Anmelden</Link>
              <Link to="/preise" className="btn-primary text-sm">Registrieren</Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 4l12 12M16 4L4 16" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 6h14M3 10h14M3 14h14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-1">
          {user ? (
            <>
              <Link to="/spiele" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-gray-700 hover:text-brand-600">Spiele</Link>
              <Link to="/preise" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-gray-700 hover:text-brand-600">Preise</Link>
              <Link to="/profil" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-gray-700 hover:text-brand-600">Profil</Link>
              <div className="pt-2 border-t border-gray-100">
                <button onClick={handleSignOut} className="w-full text-left py-2.5 text-sm text-red-500 hover:text-red-700">Abmelden</button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-gray-700 hover:text-brand-600">Anmelden</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-gray-700 hover:text-brand-600">Registrieren</Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
