export default function Impressum() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Impressum</h1>
      <div className="card space-y-4 text-sm text-gray-600">
        <div>
          <h2 className="font-bold text-gray-900 mb-1">Angaben gemäß § 5 TMG</h2>
          <p>KickMatch<br />Betreiber: wird ergänzt<br />Adresse: wird ergänzt</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-900 mb-1">Kontakt</h2>
          <p>E-Mail: kontakt@kickmatch.de</p>
        </div>
        <div>
          <h2 className="font-bold text-gray-900 mb-1">Haftungsausschluss</h2>
          <p className="leading-relaxed">
            Die Inhalte dieser Plattform wurden mit größtmöglicher Sorgfalt erstellt.
            Für die Richtigkeit, Vollständigkeit und Aktualität übernehmen wir keine Gewähr.
          </p>
        </div>
      </div>
    </div>
  )
}
