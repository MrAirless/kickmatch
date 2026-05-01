import { useState } from 'react'

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [club, setClub] = useState('')
  const [trainers, setTrainers] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const subject = encodeURIComponent(`Individueller Plan Anfrage — ${club}`)
    const body = encodeURIComponent(
      `Name: ${name}\nE-Mail: ${email}\nVerein: ${club}\nTrainer-Lizenzen: ${trainers}${message ? `\n\nNachricht:\n${message}` : ''}`
    )
    window.location.href = `mailto:info@kickmatch.net?subject=${subject}&body=${body}`
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Individueller Plan</h1>
        <p className="text-gray-500 text-sm">
          Du benötigst mehr als 10 Trainer-Lizenzen? Wir finden gemeinsam die beste Lösung für euren Verein.
        </p>
      </div>

      <div className="card space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dein Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Max Mustermann"
              />
            </div>
            <div>
              <label className="label">E-Mail</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="trainer@verein.de"
              />
            </div>
          </div>

          <div>
            <label className="label">Vereinsname</label>
            <input
              type="text"
              className="input"
              value={club}
              onChange={(e) => setClub(e.target.value)}
              required
              placeholder="z.B. FC Musterhausen"
            />
          </div>

          <div>
            <label className="label">Wie viele Trainer-Lizenzen benötigt ihr?</label>
            <select
              className="input"
              value={trainers}
              onChange={(e) => setTrainers(e.target.value)}
              required
            >
              <option value="">Bitte wählen…</option>
              <option value="11-20">11–20 Trainer</option>
              <option value="21-50">21–50 Trainer</option>
              <option value="51+">Mehr als 50 Trainer</option>
            </select>
          </div>

          <div>
            <label className="label">
              Nachricht <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="input min-h-[100px] resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Weitere Informationen zu euren Anforderungen…"
            />
          </div>

          <button type="submit" className="btn-primary w-full justify-center py-3">
            E-Mail öffnen &amp; senden
          </button>
        </form>
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Wir melden uns in der Regel innerhalb von 24 Stunden.
      </p>
    </div>
  )
}
