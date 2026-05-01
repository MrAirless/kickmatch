import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const rolle = user?.user_metadata?.rolle || 'trainer'
  const istSchiri = rolle === 'schiedsrichter'
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user || istSchiri) return
    supabase.from("buchungen").select("id", { count: "exact", head: true })
      .eq("anbieter_email", user.email).eq("gelesen", false)
      .then(({ count }) => setUnreadCount(count || 0))
  }, [user, istSchiri])

  const currentTab = location.pathname === '/spiele'
    ? (new URLSearchParams(location.search).get('tab') || 'liste')
    : null

  const isActive = (path) =>
    location.pathname === path && location.pathname !== '/spiele'
      ? 'text-brand-600 font-medium'
      : 'text-gray-500 hover:text-gray-900'

  const isTab = (tab) =>
    currentTab === tab ? 'text-brand-600 font-medium' : 'text-gray-500 hover:text-gray-900'

  const tabHref = (tab) => tab === 'liste' ? '/spiele' : `/spiele?tab=${tab}`

  async function handleSignOut() {
    await signOut()
    navigate('/')
    setMenuOpen(false)
  }

  const trainerTabs = [
    { tab: 'liste', label: 'Spiele' },
    { tab: 'neu', label: '+ Eintragen' },
    { tab: 'suche', label: 'Suchen' },
    { tab: 'boerse', label: '🟡 Schiri-Börse' },
    { tab: 'meine', label: 'Meine Spiele' },
  ]
  const schiriTabs = [
    { tab: 'liste', label: 'Spiele' },
    { tab: 'suche', label: 'Suchen' },
    { tab: 'boerse', label: '🟡 Schiri-Börse' },
  ]
  const spieleTabs = istSchiri ? schiriTabs : trainerTabs

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

        <Link to="/" className="flex items-center gap-2 flex-shrink-0" onClick={() => setMenuOpen(false)}>
          <img src="/logo.png" alt="KickMatch" className="w-8 h-8 rounded-lg flex-shrink-0" />
          <span className="font-semibold text-gray-900 text-sm">KickMatch</span>
        </Link>

        {user ? (
          <div className="hidden md:flex items-center gap-5 text-sm">
            {spieleTabs.map(({ tab, label }) => (
              <Link key={tab} to={tabHref(tab)} className={isTab(tab)}>{label}</Link>
            ))}
            <Link to="/preise" className={isActive('/preise')}>Preise</Link>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link to="/preise" className={isActive('/preise')}>Preise</Link>
          </div>
        )}

        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          {user ? (
            <>
              {!istSchiri && (
                <Link to="/spiele?tab=meine" className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-0.5">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )}
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
          {user && !istSchiri && (
            <Link to="/spiele?tab=meine" className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-0.5">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}
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
              {spieleTabs.map(({ tab, label }) => (
                <Link key={tab} to={tabHref(tab)} onClick={() => setMenuOpen(false)} className="block py-2.5 text-sm text-gray-700 hover:text-brand-600">{label}</Link>
              ))}
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
