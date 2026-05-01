export default function Datenschutz() {
  const abschnitte = [
    { titel: '1. Verantwortlicher', text: 'Verantwortlich für die Datenverarbeitung ist der Betreiber der KickMatch-Plattform.' },
    { titel: '2. Gespeicherte Daten', text: 'E-Mail-Adresse, Name, Telefonnummer, Vereinsname, Lizenzinformationen (Schiedsrichter), Spieldaten sowie technische Zugriffsdaten.' },
    { titel: '3. Zweck', text: 'Koordination von Freundschaftsspielen und Schiedsrichter-Einsätzen. Kontaktdaten sind für angemeldete Nutzer sichtbar.' },
    { titel: '4. Rechtsgrundlage', text: 'Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) und Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO).' },
    { titel: '5. Speicherdauer', text: 'Bis zur Löschung des Kontos. Danach werden alle Daten innerhalb von 30 Tagen entfernt.' },
    { titel: '6. Drittanbieter', text: 'Supabase (Datenbankserver Frankfurt/EU, DSGVO-konform), Stripe (Zahlungsabwicklung). Keine Weitergabe zu Werbezwecken.' },
    { titel: '7. Deine Rechte', text: 'Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerruf der Einwilligung.' },
    { titel: '8. Cookies', text: 'Nur technisch notwendige Session-Cookies. Keine Tracking- oder Werbe-Cookies.' },
  ]

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Datenschutzerklärung</h1>
      <div className="card space-y-6">
        {abschnitte.map((a) => (
          <div key={a.titel}>
            <h2 className="text-sm font-bold text-gray-900 mb-2">{a.titel}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{a.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
