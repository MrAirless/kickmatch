import { useState } from "react";

export const MANNSCHAFTEN = {
  "Junioren":    ["E-Jugend (U10)", "D-Jugend (U12)", "C-Jugend (U14)", "B-Jugend (U17)", "A-Jugend (U19)"],
  "Juniorinnen": ["E-Juniorinnen (U10)", "D-Juniorinnen (U12)", "C-Juniorinnen (U14)", "B-Juniorinnen (U17)", "A-Juniorinnen (U19)"],
  "Herren":      ["Herren 1. Mannschaft", "Herren 2. Mannschaft", "Herren 3. Mannschaft", "Herren Ü32", "Herren Ü40", "Herren Ü50"],
  "Damen":       ["Damen 1. Mannschaft", "Damen 2. Mannschaft", "Damen Ü32"],
};

export const SPIELFELD_GROESSEN = ["Vollfeld (11 vs 11)", "Großfeld (9 vs 9)", "Mittelfeld (7 vs 7)", "Kleinfeld (5 vs 5)", "Futsal"];
export const SCHIRI_LIZENZEN = ["DFB-Schiedsrichter (Kreisklasse)", "DFB-Schiedsrichter (Bezirksliga)", "DFB-Schiedsrichter (Landesliga)", "DFB-Schiedsrichter (Verbandsliga)", "FIFA-Schiedsrichter", "Sonstige"];

export function formatDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function getKategorie(mannschaft) {
  for (const [kat, liste] of Object.entries(MANNSCHAFTEN)) {
    if (liste.includes(mannschaft)) return kat;
  }
  return "";
}

export function kategorieColor(kat) {
  const colors = {
    "Junioren":    { bg: "#E6F1FB", text: "#0C447C", border: "#B5D4F4" },
    "Juniorinnen": { bg: "#FAEEDA", text: "#633806", border: "#F0C98A" },
    "Herren":      { bg: "#EAF3DE", text: "#27500A", border: "#B8DCA0" },
    "Damen":       { bg: "#EEEDFE", text: "#3C3489", border: "#C5C2F8" },
  };
  return colors[kat] || { bg: "#F1EFE8", text: "#444441", border: "#D8D6CE" };
}

export function InlineBadge({ bg, color, border, children }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${border}` }}>
      {children}
    </span>
  );
}

export function StrengthDots({ value }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: i <= value ? "#1D9E75" : "#ddd", border: i <= value ? "none" : "1px solid #ccc" }} />
      ))}
    </div>
  );
}

export function MannschaftAuswahl({ value, onChange }) {
  const [aktiveKat, setAktiveKat] = useState(() => getKategorie(value) || "Junioren");
  return (
    <div>
      <div className="flex gap-1 mb-2.5 bg-gray-100 rounded-xl p-1">
        {Object.keys(MANNSCHAFTEN).map((kat) => {
          const c = kategorieColor(kat);
          const aktiv = aktiveKat === kat;
          return (
            <button key={kat}
              onClick={() => { setAktiveKat(kat); onChange(MANNSCHAFTEN[kat][0]); }}
              style={aktiv ? { background: c.bg, color: c.text, border: `1px solid ${c.border}` } : {}}
              className={`flex-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-colors border ${aktiv ? "" : "border-transparent text-gray-400 bg-transparent"}`}>
              {kat}
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-1.5">
        {MANNSCHAFTEN[aktiveKat].map((m) => {
          const aktiv = value === m;
          const c = kategorieColor(aktiveKat);
          return (
            <button key={m}
              onClick={() => onChange(m)}
              style={aktiv ? { background: c.bg, color: c.text, borderColor: c.border } : {}}
              className={`px-3.5 py-2.5 rounded-lg text-sm text-left transition-colors border ${aktiv ? "font-semibold" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
              {aktiv ? "✓ " : ""}{m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingModal({ game, onClose, onConfirm }) {
  const [form, setForm] = useState({ name: "", verein: "", tel: "", mannschaft: "E-Jugend (U10)", msg: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.name || !form.verein || !form.tel) { alert("Bitte Name, Verein und Telefonnummer ausfüllen."); return; }
    setLoading(true); await onConfirm(form); setLoading(false);
  }

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto border border-gray-100 shadow-2xl">
        <h3 className="text-lg font-bold mb-1">Spiel anfragen</h3>
        <p className="text-sm text-gray-500 mb-5">{game.verein} · {formatDate(game.datum)} · {game.uhrzeit} Uhr</p>
        <div className="space-y-3">
          {[
            { label: "Dein Name", key: "name", type: "text", placeholder: "Vor- und Nachname" },
            { label: "Dein Verein", key: "verein", type: "text", placeholder: "z.B. FC Musterstadt" },
            { label: "Telefonnummer", key: "tel", type: "tel", placeholder: "+49 …" },
            { label: "Nachricht (optional)", key: "msg", type: "text", placeholder: "z.B. Können wir 10:30 Uhr machen?" },
          ].map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="input" />
            </div>
          ))}
          <div>
            <label className="label">Deine Mannschaft</label>
            <MannschaftAuswahl value={form.mannschaft} onChange={(v) => setForm({ ...form, mannschaft: v })} />
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full justify-center mt-5" style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? "Wird gespeichert…" : "Anfrage absenden"}
        </button>
        <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 mt-2">Abbrechen</button>
      </div>
    </div>
  );
}

export function BuchungEditModal({ buchung, onClose, onSave }) {
  const [form, setForm] = useState({
    mannschaft: buchung.bucher_mannschaft || 'E-Jugend (U10)',
    tel: buchung.bucher_tel || '',
    nachricht: buchung.bucher_nachricht || '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    await onSave({ bucher_mannschaft: form.mannschaft, bucher_tel: form.tel, bucher_nachricht: form.nachricht || null });
    setLoading(false);
  }

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto border border-gray-100 shadow-2xl">
        <h3 className="text-lg font-bold mb-1">Anfrage bearbeiten</h3>
        <p className="text-sm text-gray-500 mb-5">Du kannst nur offene Anfragen bearbeiten.</p>
        <div className="space-y-4">
          <div>
            <label className="label">Deine Mannschaft</label>
            <MannschaftAuswahl value={form.mannschaft} onChange={(v) => setForm({ ...form, mannschaft: v })} />
          </div>
          <div>
            <label className="label">Telefonnummer</label>
            <input type="tel" className="input" value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} />
          </div>
          <div>
            <label className="label">Nachricht (optional)</label>
            <input type="text" className="input" value={form.nachricht} onChange={(e) => setForm({ ...form, nachricht: e.target.value })} placeholder="z.B. Können wir 10:30 Uhr machen?" />
          </div>
        </div>
        <button onClick={handleSave} disabled={loading} className="btn-primary w-full justify-center mt-5" style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Wird gespeichert…' : 'Änderungen speichern'}
        </button>
        <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 mt-2">Abbrechen</button>
      </div>
    </div>
  );
}

export function SpieleEditModal({ game, onClose, onSave }) {
  const mannschaft0 = game.mannschaft || game.jugend || MANNSCHAFTEN.Junioren[0];
  const [type, setType] = useState(game.type || "angebot");
  const [mannschaft, setMannschaft] = useState(mannschaft0);
  const [staerke, setStaerke] = useState(game.staerke || 3);
  const [umkreis, setUmkreis] = useState(game.umkreis_km || 30);
  const [schiriBenoetigt, setSchiriBenoetigt] = useState(game.schiri_benoetigt || false);
  const [uhrzeitFlexibel, setUhrzeitFlexibel] = useState(game.uhrzeit === 'flexibel');
  const [laden, setLaden] = useState(false);
  const [form, setForm] = useState({
    datum: game.datum || "", uhrzeit: game.uhrzeit === 'flexibel' ? "10:00" : (game.uhrzeit || "10:00"), rasen: game.rasen || "Naturrasen",
    platz: game.platz || "", adresse: game.adresse || "", trainer_name: game.trainer_name || "",
    telefon: game.telefon || "", verein: game.verein || "", spielfeld_groesse: game.spielfeld_groesse || "",
    spieldauer: game.spieldauer ? String(game.spieldauer) : "", wichtige_infos: game.wichtige_infos || "",
  });

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  async function handleSave() {
    if (!form.datum || !form.trainer_name || !form.verein) { alert("Bitte Datum, Name und Verein ausfüllen."); return; }
    setLaden(true);
    await onSave(game.id, { ...form, type, mannschaft, staerke, umkreis_km: type === "anfrage" ? umkreis : null, schiri_benoetigt: schiriBenoetigt, schiri_status: schiriBenoetigt ? (game.schiri_status || "offen") : null, uhrzeit: (type === "anfrage" && uhrzeitFlexibel) ? "flexibel" : form.uhrzeit });
    setLaden(false);
  }

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-100 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-500 hover:bg-gray-100">✕</button>
        <h3 className="text-lg font-bold mb-1">Spiel bearbeiten</h3>
        <p className="text-sm text-gray-500 mb-5">{game.verein} · {formatDate(game.datum)}</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { val: "angebot", label: "⚽ Spiel anbieten", bg: "#E1F5EE", txt: "#085041", bd: "#A8DFC4" },
              { val: "anfrage", label: "🔍 Spiel anfragen", bg: "#EEEDFE", txt: "#3C3489", bd: "#C5C2F8" },
            ].map((btn) => (
              <button key={btn.val} onClick={() => setType(btn.val)}
                style={type === btn.val ? { background: btn.bg, color: btn.txt, borderColor: btn.bd } : {}}
                className={`p-3 rounded-xl text-sm font-semibold border-2 transition-colors ${type === btn.val ? "" : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"}`}>
                {btn.label}
              </button>
            ))}
          </div>
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Mannschaft</p>
            <MannschaftAuswahl value={mannschaft} onChange={setMannschaft} />
          </div>
          <div className="card space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Spieldaten</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Datum</label><input type="date" className="input" value={form.datum} onChange={(e) => set("datum", e.target.value)} /></div>
              <div>
                <label className="label">Uhrzeit</label>
                {type === "anfrage" && uhrzeitFlexibel
                  ? <div className="input text-sm text-gray-400 flex items-center">Flexibel</div>
                  : <input type="time" className="input" value={form.uhrzeit} onChange={(e) => set("uhrzeit", e.target.value)} />
                }
              </div>
            </div>
            {type === "anfrage" && (
              <label className="flex items-center gap-2 cursor-pointer -mt-1">
                <input type="checkbox" checked={uhrzeitFlexibel} onChange={(e) => setUhrzeitFlexibel(e.target.checked)} className="w-4 h-4 accent-brand-600" />
                <span className="text-sm text-gray-600">Uhrzeit flexibel / kein fester Termin</span>
              </label>
            )}
            <div>
              <label className="label">Rasenart</label>
              <select className="input" value={form.rasen} onChange={(e) => set("rasen", e.target.value)}>
                {type === "anfrage" && <option value="Egal">Egal / flexibel</option>}
                {["Naturrasen", "Kunstrasen", "Hartplatz", "Halle"].map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Spielstärke</label>
              <div className="flex gap-2 mt-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setStaerke(n)}
                    className={`w-10 h-10 rounded-full border-2 text-sm font-bold transition-colors ${staerke === n ? "border-brand-600 bg-brand-600 text-white" : "border-gray-200 bg-white text-gray-500 hover:border-brand-300"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="card space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ort</p>
            {type === "angebot" ? (
              <>
                <div><label className="label">Sportplatz Name</label><input type="text" className="input" placeholder="z.B. Sportpark Nord" value={form.platz} onChange={(e) => set("platz", e.target.value)} /></div>
                <div><label className="label">Adresse</label><input type="text" className="input" placeholder="Musterstr. 1, 68159 Mannheim" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} /></div>
              </>
            ) : (
              <div><label className="label">Stadt / PLZ</label><input type="text" className="input" placeholder="z.B. Mannheim" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} /></div>
            )}
          </div>
          <div className="card space-y-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trainer & Verein</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Name</label><input type="text" className="input" value={form.trainer_name} onChange={(e) => set("trainer_name", e.target.value)} /></div>
              <div><label className="label">Telefon</label><input type="tel" className="input" value={form.telefon} onChange={(e) => set("telefon", e.target.value)} /></div>
            </div>
            <div><label className="label">Verein</label><input type="text" className="input" value={form.verein} onChange={(e) => set("verein", e.target.value)} /></div>
          </div>
          <div className="card">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Schiedsrichter</p>
            <label className="flex gap-3 items-center cursor-pointer">
              <button type="button" onClick={() => setSchiriBenoetigt(!schiriBenoetigt)}
                className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${schiriBenoetigt ? "bg-brand-600" : "bg-gray-200"}`}>
                <span className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-all shadow-sm ${schiriBenoetigt ? "left-5" : "left-0.5"}`} />
              </button>
              <div>
                <p className="text-sm font-semibold text-gray-900">Schiedsrichter wird benötigt</p>
                <p className="text-xs text-gray-400 mt-0.5">Das Spiel erscheint in der Schiri-Börse</p>
              </div>
            </label>
          </div>
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Weitere Angaben</p>
              <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-semibold">Optional</span>
            </div>
            <div>
              <label className="label">Spielfeldgröße</label>
              <div className="flex flex-wrap gap-1.5">
                {SPIELFELD_GROESSEN.map((g) => {
                  const aktiv = form.spielfeld_groesse === g;
                  return (
                    <button key={g} onClick={() => set("spielfeld_groesse", aktiv ? "" : g)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${aktiv ? "bg-brand-50 text-brand-800 border-brand-300 font-semibold" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                      {aktiv ? "✓ " : ""}{g}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Spieldauer (Minuten)</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[40, 50, 60, 70, 80, 90].map((min) => {
                  const aktiv = form.spieldauer === String(min);
                  return (
                    <button key={min} onClick={() => set("spieldauer", aktiv ? "" : String(min))}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${aktiv ? "bg-brand-50 text-brand-800 border-brand-300 font-semibold" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                      {aktiv ? "✓ " : ""}{min} min
                    </button>
                  );
                })}
              </div>
              <input type="text" placeholder="Eigene Dauer, z.B. 3 x 30 min…" value={form.spieldauer} onChange={(e) => set("spieldauer", e.target.value)} className="input text-sm" />
            </div>
            <div>
              <label className="label">Wichtige Infos</label>
              <textarea placeholder="z.B. Trikotfarbe, Parkplätze, Umkleiden…" value={form.wichtige_infos} onChange={(e) => set("wichtige_infos", e.target.value)} rows={3} className="input resize-y" />
            </div>
          </div>
          {type === "anfrage" && (
            <div className="card">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Suchradius</p>
              <label className="label">Maximaler Umkreis: <strong className="text-gray-900">{umkreis} km</strong></label>
              <input type="range" min={5} max={150} step={5} value={umkreis} onChange={(e) => setUmkreis(parseInt(e.target.value))} className="w-full mb-1" style={{ accentColor: "#534AB7" }} />
              <div className="flex justify-between text-xs text-gray-400">
                <span>5 km</span><span className="font-semibold" style={{ color: "#534AB7" }}>{umkreis} km</span><span>150 km</span>
              </div>
            </div>
          )}
        </div>
        <button onClick={handleSave} disabled={laden} className="btn-primary w-full justify-center mt-5" style={{ opacity: laden ? 0.7 : 1 }}>
          {laden ? "Wird gespeichert…" : "Änderungen speichern"}
        </button>
        <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 mt-2">Abbrechen</button>
      </div>
    </div>
  );
}
