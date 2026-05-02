import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function NotificationDropdown({ benachrichtigungen, ungelesenChat, onKlick, onAlleGelesen }) {
  const chatItems = Object.values(
    ungelesenChat.reduce((acc, m) => { acc[m.game_id] = m; return acc; }, {})
  )
  const alle = [...benachrichtigungen, ...chatItems]
  return (
    <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Benachrichtigungen</span>
        {alle.length > 0 && (
          <button onClick={onAlleGelesen} className="text-xs text-brand-600 hover:underline">Alle als gelesen</button>
        )}
      </div>
      {alle.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400">Keine neuen Benachrichtigungen</div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
          {alle.map((b) => (
            <button key={b.id} onClick={() => onKlick(b)} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors">
              <p className="text-sm font-semibold text-gray-900 mb-0.5">
                {b._rolle === 'chat' ? '💬 Neue Chat-Nachricht' : b.title}
              </p>
              <p className="text-xs text-gray-500">
                {b._rolle === 'chat' ? 'Zum Spiel öffnen' : (b.message || '')}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [glockeOffen, setGlockeOffen] = useState(false)
  const glockeRef = useRef(null)
  const markingReadRef = useRef(false)

  const rolle = user?.user_metadata?.rolle || 'trainer'
  const istSchiri = rolle === 'schiedsrichter'
  const [benachrichtigungen, setBenachrichtigungen] = useState([])
  const [ungelesenChat, setUngelesenChat] = useState([])
  const chatUnreadGames = new Set(ungelesenChat.map(m => m.game_id)).size
  const unreadCount = benachrichtigungen.length + chatUnreadGames

  async function ladeBenachrichtigungen() {
    if (!user || istSchiri) return
    if (markingReadRef.current) return
    const { data } = await supabase.from("notifications")
      .select("*").eq("user_email", user.email).eq("read", false)
      .order("created_at", { ascending: false })
    setBenachrichtigungen(data || [])
  }

  async function ladeChatNotifications() {
    if (!user || istSchiri) return
    const { data: buchungen } = await supabase.from("buchungen").select("game_id")
      .or(`anbieter_email.eq.${user.email},bucher_email.eq.${user.email}`)
    if (!buchungen || buchungen.length === 0) return
    const gameIds = [...new Set(buchungen.map((b) => b.game_id))]
    const letzteGelesen = JSON.parse(localStorage.getItem('chatGelesen') || '{}')
    const checks = await Promise.all(gameIds.map(async (gid) => {
      const seit = letzteGelesen[gid] || '1970-01-01'
      const { data } = await supabase.from("messages").select("id,game_id,sender_email,created_at")
        .eq("game_id", gid).gt("created_at", seit).neq("sender_email", user.email)
      return (data || []).map((m) => ({ ...m, _rolle: 'chat' }))
    }))
    setUngelesenChat(checks.flat())
  }

  useEffect(() => {
    ladeBenachrichtigungen()
    ladeChatNotifications()
  }, [user, istSchiri])

  useEffect(() => {
    if (!user || istSchiri) return
    const channel = supabase.channel('navbar-notifications')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_email=eq.${user.email}`,
      }, () => ladeBenachrichtigungen())
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'notifications',
        filter: `user_email=eq.${user.email}`,
      }, () => ladeBenachrichtigungen())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_email !== user.email) ladeChatNotifications()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user, istSchiri])

  useEffect(() => {
    function handleClick(e) {
      if (glockeRef.current && !glockeRef.current.contains(e.target)) setGlockeOffen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function chatAlsGelesenMarkieren(gameId) {
    const letzteGelesen = JSON.parse(localStorage.getItem('chatGelesen') || '{}')
    letzteGelesen[gameId] = new Date().toISOString()
    localStorage.setItem('chatGelesen', JSON.stringify(letzteGelesen))
    setUngelesenChat((prev) => prev.filter((m) => m.game_id !== gameId))
  }

  function handleNotificationClick(b) {
    setGlockeOffen(false)
    if (b._rolle === 'chat') {
      chatAlsGelesenMarkieren(b.game_id)
    } else {
      supabase.from("notifications").update({ read: true }).eq("id", b.id)
        .then(() => setBenachrichtigungen(prev => prev.filter(n => n.id !== b.id)))
    }
    window.location.href = `/spiele/${b.game_id}`
  }

  function alleGelesen() {
    const gameIds = [...new Set(ungelesenChat.map((m) => m.game_id))]
    gameIds.forEach((gid) => chatAlsGelesenMarkieren(gid))
    setBenachrichtigungen([])
    setUngelesenChat([])
    setGlockeOffen(false)
    markingReadRef.current = true
    supabase.from("notifications").update({ read: true }).eq("user_email", user.email).eq("read", false).then(() => {}).catch(() => {})
    setTimeout(() => { markingReadRef.current = false }, 2000)
  }

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
                <div ref={glockeRef} className="relative">
                  <button onClick={() => setGlockeOffen((o) => !o)} className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-0.5">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                  {glockeOffen && <NotificationDropdown benachrichtigungen={benachrichtigungen} ungelesenChat={ungelesenChat} onKlick={handleNotificationClick} onAlleGelesen={alleGelesen} />}
                </div>
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
            <div ref={glockeRef} className="relative">
              <button onClick={() => setGlockeOffen((o) => !o)} className="relative p-2 text-gray-400 hover:text-gray-700 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold px-0.5">
                    {unreadCount}
                  </span>
                )}
              </button>
              {glockeOffen && <NotificationDropdown benachrichtigungen={benachrichtigungen} ungelesenChat={ungelesenChat} onKlick={handleNotificationClick} onAlleGelesen={alleGelesen} />}
            </div>
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
