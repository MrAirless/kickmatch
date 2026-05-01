import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PLANS = [
  {
    id: 'einzellizenz',
    name: 'Einzellizenz',
    desc: 'Für einen Trainer und seine Teams',
    price: 2.99,
    priceFinal: 0,
    pricePrefix: null,
    badge: 'Aktuell kostenlos',
    badgeColor: { bg: '#EAF3DE', color: '#27500A' },
    priceId: import.meta.env.VITE_STRIPE_PRICE_EINZELLIZENZ,
    featured: false,
    features: [
      { text: 'Unbegrenzt Spiele ausschreiben', included: true },
      { text: 'Umkreissuche & Filter', included: true },
      { text: 'Bis zu 3 Teams', included: true },
      { text: 'Benachrichtigungen', included: true },
      { text: 'Turniermodus (bald)', included: false },
    ],
    cta: 'Jetzt kostenlos starten',
    discount: '100 % Rabatt — zeitlich begrenzt',
    note: null,
  },
  {
    id: 'vereinslizenz',
    name: 'Vereinslizenz',
    desc: 'Alle Trainer eines Vereins — ein Abo',
    price: 9.99,
    priceFinal: 9.99,
    pricePrefix: 'ab',
    badge: 'Empfohlen für Vereine',
    badgeColor: { bg: '#E8F8F2', color: '#0C4D38' },
    priceId: import.meta.env.VITE_STRIPE_PRICE_VEREINSLIZENZ,
    featured: true,
    features: [
      { text: 'Alle Features der Einzellizenz', included: true },
      { text: '10 Trainer-Lizenzen per Einladungslink', included: true },
      { text: 'Unbegrenzt Teams', included: true },
      { text: 'Turniermodus inklusive', included: true },
      { text: 'Vereinsverwaltung & Übersicht', included: true },
    ],
    cta: 'Vereinslizenz abonnieren',
    note: '≈ 1 € pro Trainer bei 10 Trainern',
  },
  {
    id: 'individuell',
    name: 'Individueller Plan',
    desc: 'Für größere Vereine mit besonderen Anforderungen',
    price: null,
    priceFinal: null,
    pricePrefix: null,
    badge: 'Auf Anfrage',
    badgeColor: { bg: '#F1EFE8', color: '#444441' },
    priceId: null,
    featured: false,
    features: [
      { text: 'Mehr als 10 Trainer-Lizenzen', included: true },
      { text: 'Individuelle Preisgestaltung', included: true },
      { text: 'Alle Features der Vereinslizenz', included: true },
      { text: 'Persönlicher Ansprechpartner', included: true },
    ],
    cta: 'Kontakt aufnehmen',
    note: 'Wir finden gemeinsam die beste Lösung für euren Verein.',
  },
]

export default function Home() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(null)
  const [checkoutError, setCheckoutError] = useState('')

  async function handleSubscribe(plan) {
    if (plan.id === 'individuell') { window.location.href = '/kontakt'; return }
    if (!user) { window.location.href = '/register'; return }
    if (plan.priceFinal === 0) { window.location.href = '/spiele'; return }
    setLoading(plan.id)
    setCheckoutError('')
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId: plan.priceId, email: user.email, userId: user.id }),
      })
      const { url, error: apiError } = await res.json()
      if (apiError) throw new Error(apiError)
      window.location.href = url
    } catch {
      setCheckoutError('Fehler beim Laden von Stripe. Bitte versuche es erneut.')
    }
    setLoading(null)
  }

  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 text-sm font-medium px-3 py-1 rounded-full mb-6">
          <span className="w-2 h-2 bg-brand-400 rounded-full"></span>
          Freundschaftsspiele für Fußball-Trainer
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          Finde den perfekten Gegner<br />
          <span className="text-brand-600">für dein Team</span>
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          KickMatch verbindet Trainer, die Freundschaftsspiele für ihre Teams suchen.
        </p>
        <div className="flex items-center justify-center gap-3">
          {user ? (
            <Link to="/spiele" className="btn-primary text-base px-6 py-3">Spiele durchsuchen</Link>
          ) : (
            <>
              <Link to="/preise" className="btn-primary text-base px-6 py-3">Registrieren</Link>
              <Link to="/login" className="btn-secondary text-base px-6 py-3">Anmelden</Link>
            </>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '📍', title: 'Umkreissuche', desc: 'Finde Spiele in deiner Nähe — per GPS oder Stadtsuche.' },
            { icon: '🏆', title: 'Passende Gegner', desc: 'Altersgruppe, Spielstärke und Feldgröße als Filter.' },
            { icon: '📅', title: 'Einfach organisieren', desc: 'Spiel ausschreiben, Anfragen annehmen, Schiri finden.' },
          ].map((f) => (
            <div key={f.title} className="card text-center py-8">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tarife & Preise</h2>
            <p className="text-gray-500 text-sm">Jetzt kostenlos starten — keine Kreditkarte nötig</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div key={plan.id} className={`bg-white rounded-2xl p-6 flex flex-col ${plan.featured ? 'border-2 border-brand-600 shadow-md' : 'border border-gray-200 shadow-sm'}`}>
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full mb-4"
                  style={{ background: plan.badgeColor.bg, color: plan.badgeColor.color }}>
                  {plan.badge}
                </span>
                <h3 className="text-xl font-bold text-gray-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-gray-500 mb-5">{plan.desc}</p>
                <div className="mb-2">
                  {plan.priceFinal === null ? (
                    <span className="text-3xl font-bold text-gray-900">Auf Anfrage</span>
                  ) : (
                    <>
                      {plan.price !== plan.priceFinal && (
                        <span className="text-sm text-gray-400 line-through mr-2">{plan.price.toFixed(2)} €</span>
                      )}
                      {plan.pricePrefix && (
                        <span className="text-lg font-normal text-gray-500 mr-1">{plan.pricePrefix}</span>
                      )}
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.priceFinal === 0 ? '0' : plan.priceFinal.toFixed(2)} €
                      </span>
                      <span className="text-gray-400 text-sm ml-1">/ Monat</span>
                    </>
                  )}
                </div>
                {plan.discount && (
                  <div className="inline-block text-xs font-medium px-3 py-1.5 rounded-lg mb-4"
                    style={{ background: '#EAF3DE', color: '#27500A' }}>
                    {plan.discount}
                  </div>
                )}
                {plan.note && <p className="text-xs text-gray-400 mb-4">{plan.note}</p>}
                <div className="border-t border-gray-100 my-4" />
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      {f.included ? (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
                          <circle cx="8" cy="8" r="7" fill={plan.featured ? '#E8F8F2' : '#EAF3DE'} />
                          <path d="M4.5 8l2.5 2.5L11.5 5.5" stroke={plan.featured ? '#1D9E75' : '#639922'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 mt-0.5">
                          <circle cx="8" cy="8" r="7" fill="#F1EFE8" />
                          <path d="M5.5 8h5" stroke="#B4B2A9" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      )}
                      <span className={f.included ? 'text-gray-700' : 'text-gray-400'}>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading === plan.id}
                  className={`w-full py-3 rounded-xl text-sm font-medium transition-colors mt-auto ${
                    plan.featured
                      ? 'bg-brand-600 hover:bg-brand-800 text-white'
                      : plan.id === 'individuell'
                      ? 'bg-gray-900 hover:bg-gray-700 text-white'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200'
                  }`}
                >
                  {loading === plan.id ? 'Wird geladen…' : plan.cta}
                </button>
              </div>
            ))}
          </div>
          {checkoutError && (
            <div className="mt-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg text-center">{checkoutError}</div>
          )}
          <p className="text-center text-xs text-gray-400 mt-8">
            Alle Preise inkl. MwSt. · Monatlich kündbar · Sichere Zahlung via Stripe
          </p>
        </div>
      </div>
    </div>
  )
}
