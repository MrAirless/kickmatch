import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

// ─── Mannschafts-Optionen ──────────────────────────────────────────────────────

const MANNSCHAFTEN = {
  "Junioren": ["E-Jugend (U10)", "D-Jugend (U12)", "C-Jugend (U14)", "B-Jugend (U17)", "A-Jugend (U19)"],
  "Juniorinnen": ["E-Juniorinnen (U10)", "D-Juniorinnen (U12)", "C-Juniorinnen (U14)", "B-Juniorinnen (U17)", "A-Juniorinnen (U19)"],
  "Herren": ["Herren 1. Mannschaft", "Herren 2. Mannschaft", "Herren 3. Mannschaft", "Herren Ü32", "Herren Ü40", "Herren Ü50"],
  "Damen": ["Damen 1. Mannschaft", "Damen 2. Mannschaft", "Damen Ü32"],
};

const SPIELFELD_GROESSEN = ["Vollfeld (11 vs 11)", "Großfeld (9 vs 9)", "Mittelfeld (7 vs 7)", "Kleinfeld (5 vs 5)", "Futsal"];

// ─── Hilfsfunktionen ───────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return "";
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}`;
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getKategorie(mannschaft) {
  for (const [kat, liste] of Object.entries(MANNSCHAFTEN)) {
    if (liste.includes(mannschaft)) return kat;
  }
  return "";
}

function kategorieColor(kat) {
  const colors = {
    "Junioren":    { bg: "#E6F1FB", text: "#0C447C", border: "#B5D4F4" },
    "Juniorinnen": { bg: "#FAEEDA", text: "#633806", border: "#F0C98A" },
    "Herren":      { bg: "#EAF3DE", text: "#27500A", border: "#B8DCA0" },
    "Damen":       { bg: "#EEEDFE", text: "#3C3489", border: "#C5C2F8" },
  };
  return colors[kat] || { bg: "#F1EFE8", text: "#444441", border: "#D8D6CE" };
}

// ─── Sortier-Funktion ──────────────────────────────────────────────────────────

function sortiereSpiele(games, sortBy, userLocation) {
  const sorted = [...games];
  switch (sortBy) {
    case "datum_asc":
      return sorted.sort((a, b) => a.datum.localeCompare(b.datum));
    case "datum_desc":
      return sorted.sort((a, b) => b.datum.localeCompare(a.datum));
    case "neu":
      return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case "entfernung":
      if (!userLocation) return sorted;
      return sorted.sort((a, b) => {
        const da = a.lat && a.lng ? haversine(userLocation.lat, userLocation.lng, a.lat, a.lng) : 9999;
        const db = b.lat && b.lng ? haversine(userLocation.lat, userLocation.lng, b.lat, b.lng) : 9999;
        return da - db;
      });
    case "staerke_asc":
      return sorted.sort((a, b) => a.staerke - b.staerke);
    case "staerke_desc":
      return sorted.sort((a, b) => b.staerke - a.staerke);
    default:
      return sorted;
  }
}

// ─── Standort-Modal ────────────────────────────────────────────────────────────

function StandortModal({ onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stadtInput, setStadtInput] = useState("");

  async function useGPS() {
    setLoading(true); setError("");
    if (!navigator.geolocation) { setError("GPS nicht unterstützt."); setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          const stadt = data.address.city || data.address.town || data.address.village || data.address.county || "Unbekannt";
          onSave({ lat: latitude, lng: longitude, label: stadt });
        } catch { onSave({ lat: latitude, lng: longitude, label: "GPS-Standort" }); }
        setLoading(false);
      },
      () => { setError("GPS-Zugriff verweigert. Bitte manuell eingeben."); setLoading(false); }
    );
  }

  async function useStadt() {
    if (!stadtInput.trim()) { setError("Bitte Stadt oder PLZ eingeben."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(stadtInput)}&format=json&limit=1&countrycodes=de`);
      const data = await res.json();
      if (!data.length) { setError("Ort nicht gefunden."); setLoading(false); return; }
      onSave({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: stadtInput.trim() });
    } catch { setError("Fehler bei der Suche."); }
    setLoading(false);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 360, width: "100%", border: "1px solid #e0e0e0", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", border: "1px solid #e0e0e0", background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>✕</button>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Mein Standort</div>
        <div style={{ fontSize: 13, color: "#777", marginBottom: 20 }}>Für Umkreissuche und Entfernungsanzeige</div>
        <button onClick={useGPS} disabled={loading} style={{ width: "100%", padding: 12, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 12 }}>
          {loading ? "Wird ermittelt..." : "📍 GPS-Standort verwenden"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
          <span style={{ fontSize: 12, color: "#aaa" }}>oder</span>
          <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
        </div>
        <input type="text" placeholder="z.B. Mannheim oder 68159" value={stadtInput} onChange={(e) => setStadtInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && useStadt()}
          style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", marginBottom: 10, boxSizing: "border-box" }} />
        <button onClick={useStadt} disabled={loading} style={{ width: "100%", padding: 11, background: "#185FA5", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
          Standort bestätigen
        </button>
        {error && <div style={{ marginTop: 12, padding: "8px 12px", background: "#FCEBEB", borderRadius: 8, fontSize: 13, color: "#791F1F", border: "1px solid #F09595" }}>{error}</div>}
      </div>
    </div>
  );
}

// ─── Mannschafts-Auswahl ───────────────────────────────────────────────────────

function MannschaftAuswahl({ value, onChange }) {
  const [aktiveKat, setAktiveKat] = useState(() => getKategorie(value) || "Junioren");
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10, background: "#f0f2f5", borderRadius: 10, padding: 4 }}>
        {Object.keys(MANNSCHAFTEN).map((kat) => {
          const c = kategorieColor(kat);
          const aktiv = aktiveKat === kat;
          return (
            <button key={kat} onClick={() => { setAktiveKat(kat); onChange(MANNSCHAFTEN[kat][0]); }}
              style={{ flex: 1, padding: "7px 4px", border: aktiv ? `1px solid ${c.border}` : "1px solid transparent", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 500, background: aktiv ? c.bg : "transparent", color: aktiv ? c.text : "#888" }}>
              {kat}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {MANNSCHAFTEN[aktiveKat].map((m) => {
          const aktiv = value === m;
          const c = kategorieColor(aktiveKat);
          return (
            <button key={m} onClick={() => onChange(m)}
              style={{ padding: "10px 14px", border: `1.5px solid ${aktiv ? c.border : "#e5e5e5"}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: aktiv ? 600 : 400, textAlign: "left", background: aktiv ? c.bg : "white", color: aktiv ? c.text : "#444" }}>
              {aktiv ? "✓ " : ""}{m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Hilfskomponenten ──────────────────────────────────────────────────────────

function StrengthDots({ value }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: i <= value ? "#1D9E75" : "#ddd", border: i <= value ? "none" : "1px solid #ccc" }} />
      ))}
    </div>
  );
}

function Badge({ children, variant = "gray" }) {
  const v = {
    offer:  { bg: "#E1F5EE", text: "#085041", border: "#A8DFC4" },
    search: { bg: "#EEEDFE", text: "#3C3489", border: "#C5C2F8" },
    green:  { bg: "#EAF3DE", text: "#27500A", border: "#B8DCA0" },
    gray:   { bg: "#F1EFE8", text: "#444441", border: "#D8D6CE" },
    orange: { bg: "#FAEEDA", text: "#633806", border: "#F0C98A" },
    blue:   { bg: "#E6F1FB", text: "#0C447C", border: "#B5D4F4" },
  };
  const s = v[variant] || v.gray;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ background: "#1D9E75", color: "white", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, marginBottom: 14, border: "1px solid #158F62", boxShadow: "0 2px 8px rgba(29,158,117,0.3)" }}>
      ✓ {message}
    </div>
  );
}

function Ladeindikator() {
  return <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa", fontSize: 14 }}>Daten werden geladen...</div>;
}

const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "white" };
const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 };
const sec = { background: "white", border: "1.5px solid #e0e0e0", borderRadius: 12, padding: "1.25rem", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };

// ─── Spielkarte ────────────────────────────────────────────────────────────────

function GameCard({ game, userLocation, onClick }) {
  const dist = userLocation && game.lat && game.lng
    ? haversine(userLocation.lat, userLocation.lng, game.lat, game.lng)
    : null;
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const c = kategorieColor(kat);

  return (
    <div onClick={() => onClick(game)}
      style={{ background: "white", border: "1.5px solid #e0e0e0", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 10, cursor: "pointer", transition: "border-color .15s, box-shadow .15s", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1D9E75"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(29,158,117,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
    >
      {/* Obere Zeile: Badges + Datum */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Badge variant={game.type === "angebot" ? "offer" : "search"}>{game.type === "angebot" ? "⚽ Angebot" : "🔍 Anfrage"}</Badge>
          {kat && <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{kat}</span>}
          {game.status === "gebucht" && <Badge variant="green">✓ Gebucht</Badge>}
          {game.type === "anfrage" && game.umkreis_km && <Badge variant="orange">📍 max. {game.umkreis_km} km</Badge>}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
          {dist !== null && <Badge variant="gray">{dist} km</Badge>}
          <span style={{ fontSize: 12, color: "#777", fontWeight: 500 }}>{formatDate(game.datum)}</span>
        </div>
      </div>

      {/* Verein + Mannschaft */}
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{game.verein}</div>
      <div style={{ fontSize: 13, color: "#555", fontWeight: 500, marginBottom: 8 }}>{mannschaft}</div>

      {/* Trennlinie */}
      <div style={{ height: 1, background: "#f0f0f0", marginBottom: 8 }} />

      {/* Meta-Infos */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>🕐 {game.uhrzeit} Uhr</span>
        {game.platz && <span style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>📍 {game.platz}</span>}
        <span style={{ fontSize: 12, color: "#666", display: "flex", alignItems: "center", gap: 4 }}>🌿 {game.rasen}</span>
        {game.spielfeld_groesse && <span style={{ fontSize: 12, color: "#666" }}>⬛ {game.spielfeld_groesse}</span>}
        {game.spieldauer && <span style={{ fontSize: 12, color: "#666" }}>⏱️ {game.spieldauer} min</span>}
      </div>

      {/* Spielstärke */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>Spielstärke:</span>
        <StrengthDots value={game.staerke} />
        <span style={{ fontSize: 11, color: "#888" }}>({game.staerke}/5)</span>
      </div>

      {/* Wichtige Infos */}
      {game.wichtige_infos && (
        <div style={{ marginTop: 8, padding: "7px 10px", background: "#FAEEDA", borderRadius: 6, fontSize: 12, color: "#633806", border: "1px solid #F0C98A" }}>
          ℹ️ {game.wichtige_infos}
        </div>
      )}
    </div>
  );
}

// ─── Sortier-Bar ───────────────────────────────────────────────────────────────

function SortierBar({ sortBy, onChange, userLocation }) {
  const optionen = [
    { val: "neu", label: "Neueste" },
    { val: "datum_asc", label: "Datum ↑" },
    { val: "datum_desc", label: "Datum ↓" },
    { val: "staerke_asc", label: "Stärke ↑" },
    { val: "staerke_desc", label: "Stärke ↓" },
    ...(userLocation ? [{ val: "entfernung", label: "Entfernung" }] : []),
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#888", whiteSpace: "nowrap", alignSelf: "center" }}>Sortieren:</span>
      {optionen.map((o) => (
        <button key={o.val} onClick={() => onChange(o.val)}
          style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${sortBy === o.val ? "#185FA5" : "#ddd"}`, background: sortBy === o.val ? "#185FA5" : "white", color: sortBy === o.val ? "white" : "#555", fontSize: 12, fontWeight: sortBy === o.val ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── Detailansicht (Modal) ─────────────────────────────────────────────────────

function DetailModal({ game, userLocation, onClose, onBook }) {
  if (!game) return null;
  const dist = userLocation && game.lat && game.lng ? haversine(userLocation.lat, userLocation.lng, game.lat, game.lng) : null;
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const c = kategorieColor(kat);
  const mapsUrl = game.adresse ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(game.adresse)}` : null;

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto", position: "relative", border: "1px solid #e0e0e0", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", border: "1px solid #e0e0e0", background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>✕</button>

        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
          <Badge variant={game.type === "angebot" ? "offer" : "search"}>{game.type === "angebot" ? "⚽ Spiel anbieten" : "🔍 Spiel anfragen"}</Badge>
          {kat && <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{kat}</span>}
          {game.status === "gebucht" && <Badge variant="green">✓ Gebucht</Badge>}
          {dist !== null && <Badge variant="gray">{dist} km entfernt</Badge>}
        </div>

        <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{game.verein}</div>
        <div style={{ fontSize: 14, color: "#555", fontWeight: 500, marginBottom: 16 }}>{mannschaft}</div>

        <div style={{ background: "#f8f8f8", borderRadius: 10, border: "1px solid #ebebeb", overflow: "hidden", marginBottom: 12 }}>
          {[
            { icon: "📅", label: "Datum & Uhrzeit", value: `${formatDate(game.datum)} um ${game.uhrzeit} Uhr` },
            { icon: "📍", label: "Sportplatz", value: game.platz ? `${game.platz} — ${game.adresse}` : "Noch offen" },
            { icon: "🌿", label: "Rasenart", value: game.rasen },
            ...(game.spielfeld_groesse ? [{ icon: "⬛", label: "Spielfeldgröße", value: game.spielfeld_groesse }] : []),
            ...(game.spieldauer ? [{ icon: "⏱️", label: "Spieldauer", value: `${game.spieldauer} Minuten` }] : []),
            { icon: "👤", label: "Trainer", value: game.trainer_name },
            { icon: "📞", label: "Telefon", value: game.telefon },
          ].map((row, i, arr) => (
            <div key={row.label} style={{ display: "flex", gap: 12, padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid #ebebeb" : "none", alignItems: "flex-start" }}>
              <div style={{ fontSize: 15, width: 22, flexShrink: 0 }}>{row.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{row.label}</div>
                <div style={{ fontSize: 14, color: row.label === "Telefon" ? "#185FA5" : "#1a1a1a", fontWeight: row.label === "Telefon" ? 500 : 400, marginTop: 2 }}>{row.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Spielstärke */}
        <div style={{ background: "#f8f8f8", borderRadius: 10, border: "1px solid #ebebeb", padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15 }}>💪</span>
          <div>
            <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Spielstärke</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <StrengthDots value={game.staerke} />
              <span style={{ fontSize: 13, color: "#555" }}>Stufe {game.staerke} von 5</span>
            </div>
          </div>
        </div>

        {/* Umkreis */}
        {game.type === "anfrage" && game.umkreis_km && (
          <div style={{ background: "#f8f8f8", borderRadius: 10, border: "1px solid #ebebeb", padding: "10px 14px", marginBottom: 12, display: "flex", gap: 10 }}>
            <span style={{ fontSize: 15 }}>🗺️</span>
            <div>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Gewünschter Umkreis</div>
              <div style={{ fontSize: 14, color: "#1a1a1a", marginTop: 2 }}>Maximal {game.umkreis_km} km</div>
            </div>
          </div>
        )}

        {/* Wichtige Infos */}
        {game.wichtige_infos && (
          <div style={{ background: "#FAEEDA", border: "1.5px solid #F0C98A", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#633806", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>ℹ️ Wichtige Infos</div>
            <div style={{ fontSize: 14, color: "#633806", lineHeight: 1.6 }}>{game.wichtige_infos}</div>
          </div>
        )}

        {mapsUrl && game.status !== "gebucht" && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", padding: 11, background: "#378ADD", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginBottom: 8, textAlign: "center", textDecoration: "none" }}>
            🗺️ Navigation starten (Google Maps)
          </a>
        )}

        {game.status !== "gebucht" ? (
          <button onClick={() => { onClose(); onBook(game); }} style={{ width: "100%", padding: 13, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            ⚡ Spiel jetzt annehmen
          </button>
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0", fontSize: 14, color: "#aaa", border: "1px solid #e0e0e0", borderRadius: 8 }}>Bereits vergeben</div>
        )}
      </div>
    </div>
  );
}

// ─── Buchungs-Modal ────────────────────────────────────────────────────────────

function BookingModal({ game, onClose, onConfirm }) {
  const [form, setForm] = useState({ name: "", verein: "", tel: "", mannschaft: "E-Jugend (U10)", msg: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.name || !form.verein || !form.tel) { alert("Bitte Name, Verein und Telefonnummer ausfüllen."); return; }
    setLoading(true); await onConfirm(form); setLoading(false);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 101, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto", position: "relative", border: "1px solid #e0e0e0", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", border: "1px solid #e0e0e0", background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>✕</button>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Buchung abschließen</div>
        <div style={{ fontSize: 13, color: "#777", marginBottom: 16 }}>{game.verein} · {formatDate(game.datum)} · {game.uhrzeit} Uhr</div>
        <div style={{ background: "#E6F1FB", border: "1px solid #B5D4F4", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#0C447C" }}>
          Deine Kontaktdaten werden an {game.trainer_name} übermittelt.
        </div>
        {[
          { label: "Dein Name", key: "name", type: "text", placeholder: "Vor- und Nachname" },
          { label: "Dein Verein", key: "verein", type: "text", placeholder: "z.B. FC Musterstadt" },
          { label: "Deine Telefonnummer", key: "tel", type: "tel", placeholder: "+49 ..." },
          { label: "Nachricht (optional)", key: "msg", type: "text", placeholder: "z.B. Können wir 10:30 Uhr machen?" },
        ].map((f) => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <label style={lbl}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} style={inp} />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...lbl, marginBottom: 8 }}>Deine Mannschaft</label>
          <MannschaftAuswahl value={form.mannschaft} onChange={(v) => setForm({ ...form, mannschaft: v })} />
        </div>
        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: 13, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Wird gespeichert..." : "Buchung bestätigen"}
        </button>
        <button onClick={onClose} style={{ width: "100%", padding: 10, background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: 13, marginTop: 6 }}>Abbrechen</button>
      </div>
    </div>
  );
}

// ─── Tab: Spielliste ───────────────────────────────────────────────────────────

const FILTER_KAT = ["Alle", "Angebote", "Anfragen", "Junioren", "Juniorinnen", "Herren", "Damen"];

function ListeTab({ games, userLocation, laden, onSelectGame }) {
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [sortBy, setSortBy] = useState("neu");

  const filtered = games.filter((g) => {
    const m = g.mannschaft || g.jugend || "";
    if (activeFilter === "Alle") return true;
    if (activeFilter === "Angebote") return g.type === "angebot";
    if (activeFilter === "Anfragen") return g.type === "anfrage";
    return getKategorie(m) === activeFilter;
  });

  const sortiert = sortiereSpiele(filtered, sortBy, userLocation);

  return (
    <div>
      {/* Filter-Chips */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
        {FILTER_KAT.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            style={{ padding: "6px 13px", borderRadius: 20, border: `1.5px solid ${activeFilter === f ? "#185FA5" : "#ddd"}`, background: activeFilter === f ? "#185FA5" : "white", color: activeFilter === f ? "white" : "#555", fontSize: 12, fontWeight: activeFilter === f ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
            {f}
          </button>
        ))}
      </div>

      {/* Sortier-Bar */}
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />

      {/* Ergebnis-Info */}
      {!laden && sortiert.length > 0 && (
        <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>
          {sortiert.length} {sortiert.length === 1 ? "Eintrag" : "Einträge"} gefunden
        </div>
      )}

      {laden ? <Ladeindikator /> : sortiert.length === 0
        ? <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa" }}>Noch keine Einträge vorhanden.</div>
        : sortiert.map((g) => <GameCard key={g.id} game={g} userLocation={userLocation} onClick={onSelectGame} />)
      }
    </div>
  );
}

// ─── Tab: Eintragen ────────────────────────────────────────────────────────────

function EintragenTab({ onSubmit }) {
  const [type, setType] = useState("angebot");
  const [mannschaft, setMannschaft] = useState("E-Jugend (U10)");
  const [staerke, setStaerke] = useState(3);
  const [umkreis, setUmkreis] = useState(30);
  const [laden, setLaden] = useState(false);
  const [form, setForm] = useState({ datum: "", uhrzeit: "10:00", rasen: "Naturrasen", platz: "", adresse: "", trainer_name: "", telefon: "", verein: "", spielfeld_groesse: "", spieldauer: "", wichtige_infos: "" });

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  async function handleSubmit() {
    if (!form.datum || !form.trainer_name || !form.verein) { alert("Bitte Datum, Name und Verein ausfüllen."); return; }
    setLaden(true);
    await onSubmit({ ...form, type, mannschaft, staerke, umkreis_km: type === "anfrage" ? umkreis : null });
    setForm({ datum: "", uhrzeit: "10:00", rasen: "Naturrasen", platz: "", adresse: "", trainer_name: "", telefon: "", verein: "", spielfeld_groesse: "", spieldauer: "", wichtige_infos: "" });
    setType("angebot"); setMannschaft("E-Jugend (U10)"); setStaerke(3); setUmkreis(30);
    setLaden(false);
  }

  return (
    <div>
      {/* Typ */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[
          { val: "angebot", label: "⚽ Spiel anbieten", bg: "#E1F5EE", txt: "#085041", bd: "#A8DFC4" },
          { val: "anfrage", label: "🔍 Spiel anfragen", bg: "#EEEDFE", txt: "#3C3489", bd: "#C5C2F8" },
        ].map((btn) => (
          <button key={btn.val} onClick={() => setType(btn.val)}
            style={{ flex: 1, padding: 11, borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `2px solid ${type === btn.val ? btn.bd : "#ddd"}`, background: type === btn.val ? btn.bg : "white", color: type === btn.val ? btn.txt : "#888" }}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* Mannschaft */}
      <div style={sec}><SectionLabel>Mannschaft</SectionLabel><MannschaftAuswahl value={mannschaft} onChange={setMannschaft} /></div>

      {/* Spieldaten */}
      <div style={sec}>
        <SectionLabel>Spieldaten</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Datum</label><input type="date" style={inp} value={form.datum} onChange={(e) => set("datum", e.target.value)} /></div>
          <div><label style={lbl}>Uhrzeit</label><input type="time" style={inp} value={form.uhrzeit} onChange={(e) => set("uhrzeit", e.target.value)} /></div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={lbl}>Rasenart</label>
          <select style={inp} value={form.rasen} onChange={(e) => set("rasen", e.target.value)}>
            {["Naturrasen", "Kunstrasen", "Hartplatz", "Halle"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Spielstärke (1 = schwächer, 5 = stärker)</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setStaerke(n)}
                style={{ width: 38, height: 38, borderRadius: "50%", border: `2px solid ${staerke === n ? "#1D9E75" : "#ddd"}`, background: staerke === n ? "#1D9E75" : "white", color: staerke === n ? "white" : "#555", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Optionale Felder */}
      <div style={sec}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <SectionLabel>Weitere Angaben</SectionLabel>
          <span style={{ fontSize: 10, background: "#f0f0f0", color: "#888", padding: "2px 8px", borderRadius: 10, fontWeight: 600, letterSpacing: "0.05em" }}>OPTIONAL</span>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Spielfeldgröße</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SPIELFELD_GROESSEN.map((g) => {
              const aktiv = form.spielfeld_groesse === g;
              return (
                <button key={g} onClick={() => set("spielfeld_groesse", aktiv ? "" : g)}
                  style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${aktiv ? "#185FA5" : "#ddd"}`, background: aktiv ? "#E6F1FB" : "white", color: aktiv ? "#0C447C" : "#555", fontSize: 12, cursor: "pointer", fontWeight: aktiv ? 600 : 400 }}>
                  {aktiv ? "✓ " : ""}{g}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Spieldauer (Minuten)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {[40, 50, 60, 70, 80, 90].map((min) => {
              const aktiv = parseInt(form.spieldauer) === min;
              return (
                <button key={min} onClick={() => set("spieldauer", aktiv ? "" : min)}
                  style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${aktiv ? "#1D9E75" : "#ddd"}`, background: aktiv ? "#E1F5EE" : "white", color: aktiv ? "#085041" : "#555", fontSize: 12, cursor: "pointer", fontWeight: aktiv ? 600 : 400 }}>
                  {aktiv ? "✓ " : ""}{min} min
                </button>
              );
            })}
          </div>
          <input type="number" placeholder="Eigene Dauer eingeben..." min={10} max={180} value={form.spieldauer} onChange={(e) => set("spieldauer", e.target.value)} style={{ ...inp, fontSize: 13 }} />
        </div>
        <div>
          <label style={lbl}>Wichtige Infos</label>
          <textarea placeholder="z.B. Trikotfarbe, Parkplatzhinweise, Umkleiden vorhanden..." value={form.wichtige_infos} onChange={(e) => set("wichtige_infos", e.target.value)} rows={3}
            style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
        </div>
      </div>

      {/* Umkreis bei Anfragen */}
      {type === "anfrage" && (
        <div style={sec}>
          <SectionLabel>Suchradius</SectionLabel>
          <label style={lbl}>Maximaler Umkreis: <strong>{umkreis} km</strong></label>
          <input type="range" min={5} max={150} step={5} value={umkreis} onChange={(e) => setUmkreis(parseInt(e.target.value))} style={{ width: "100%", marginBottom: 8, accentColor: "#3C3489" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa" }}>
            <span>5 km</span><span style={{ fontWeight: 600, color: "#3C3489" }}>{umkreis} km</span><span>150 km</span>
          </div>
        </div>
      )}

      {/* Ort */}
      <div style={sec}>
        <SectionLabel>{type === "angebot" ? "Ort" : "Dein Standort"}</SectionLabel>
        {type === "angebot" ? (
          <>
            <div style={{ marginBottom: 10 }}><label style={lbl}>Sportplatz Name</label><input type="text" style={inp} placeholder="z.B. Sportpark Nord" value={form.platz} onChange={(e) => set("platz", e.target.value)} /></div>
            <div><label style={lbl}>Adresse (Straße, PLZ Ort)</label><input type="text" style={inp} placeholder="Musterstr. 1, 68159 Mannheim" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} /></div>
          </>
        ) : (
          <div>
            <label style={lbl}>Stadt / PLZ</label>
            <input type="text" style={inp} placeholder="z.B. Mannheim oder 68159" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} />
          </div>
        )}
      </div>

      {/* Trainer */}
      <div style={sec}>
        <SectionLabel>Trainer & Verein</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Name</label><input type="text" style={inp} placeholder="Vor- Nachname" value={form.trainer_name} onChange={(e) => set("trainer_name", e.target.value)} /></div>
          <div><label style={lbl}>Telefon</label><input type="tel" style={inp} placeholder="+49 ..." value={form.telefon} onChange={(e) => set("telefon", e.target.value)} /></div>
        </div>
        <div><label style={lbl}>Verein</label><input type="text" style={inp} placeholder="z.B. FC Mannheim" value={form.verein} onChange={(e) => set("verein", e.target.value)} /></div>
      </div>

      <button onClick={handleSubmit} disabled={laden}
        style={{ width: "100%", padding: 13, background: laden ? "#aaa" : "#1D9E75", color: "white", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: laden ? "not-allowed" : "pointer", boxShadow: laden ? "none" : "0 2px 8px rgba(29,158,117,0.25)" }}>
        {laden ? "Wird gespeichert..." : "Veröffentlichen"}
      </button>
    </div>
  );
}

// ─── Tab: Suche ────────────────────────────────────────────────────────────────

function SucheTab({ games, userLocation, onSelectGame }) {
  const [results, setResults] = useState(null);
  const [sortBy, setSortBy] = useState("datum_asc");
  const [km, setKm] = useState(30);
  const [typ, setTyp] = useState(""); const [datum, setDatum] = useState(""); const [staerke, setStaerke] = useState(""); const [rasen, setRasen] = useState("");
  const [aktiveKat, setAktiveKat] = useState("Alle");
  const [ausgewaehlt, setAusgewaehlt] = useState([]);

  function toggleM(m) { setAusgewaehlt((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m]); }
  function reset() { setTyp(""); setDatum(""); setStaerke(""); setRasen(""); setAktiveKat("Alle"); setAusgewaehlt([]); setKm(30); setResults(null); }

  function search() {
    const loc = userLocation;
    const res = games.filter((g) => {
      const m = g.mannschaft || g.jugend || "";
      if (aktiveKat !== "Alle" && getKategorie(m) !== aktiveKat) return false;
      if (ausgewaehlt.length > 0 && !ausgewaehlt.includes(m)) return false;
      if (typ && g.type !== typ) return false;
      if (datum && g.datum < datum) return false;
      if (staerke && g.staerke !== parseInt(staerke)) return false;
      if (rasen && g.rasen !== rasen) return false;
      if (loc && g.lat && g.lng && haversine(loc.lat, loc.lng, g.lat, g.lng) > km) return false;
      return true;
    });
    setResults(sortiereSpiele(res, sortBy, loc));
  }

  const sel = { ...inp };
  const lb = lbl;

  return (
    <div>
      {!userLocation && (
        <div style={{ background: "#FAEEDA", border: "1.5px solid #F0C98A", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#633806", fontWeight: 500 }}>
          ⚠️ Kein Standort gesetzt — bitte oben rechts Standort eingeben.
        </div>
      )}

      <div style={sec}>
        <SectionLabel>Mannschaft</SectionLabel>
        <div style={{ display: "flex", gap: 4, marginBottom: 10, background: "#f0f2f5", borderRadius: 10, padding: 4 }}>
          {["Alle", ...Object.keys(MANNSCHAFTEN)].map((kat) => {
            const c = kategorieColor(kat);
            const aktiv = aktiveKat === kat;
            const hat = kat !== "Alle" && ausgewaehlt.some((m) => getKategorie(m) === kat);
            return (
              <button key={kat} onClick={() => { setAktiveKat(kat); if (kat === "Alle") setAusgewaehlt([]); }}
                style={{ flex: 1, padding: "7px 4px", border: aktiv ? `1.5px solid ${kat === "Alle" ? "#185FA5" : c.border}` : "1.5px solid transparent", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, background: aktiv ? (kat === "Alle" ? "#185FA5" : c.bg) : "transparent", color: aktiv ? (kat === "Alle" ? "white" : c.text) : "#888" }}>
                {kat}{hat && <span style={{ display: "inline-block", width: 5, height: 5, background: c.text, borderRadius: "50%", marginLeft: 3, verticalAlign: "middle" }} />}
              </button>
            );
          })}
        </div>
        {aktiveKat !== "Alle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {MANNSCHAFTEN[aktiveKat].map((m) => {
              const aktiv = ausgewaehlt.includes(m);
              const c = kategorieColor(aktiveKat);
              return (
                <button key={m} onClick={() => toggleM(m)}
                  style={{ padding: "10px 14px", border: `1.5px solid ${aktiv ? c.border : "#e5e5e5"}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: aktiv ? 600 : 400, textAlign: "left", background: aktiv ? c.bg : "white", color: aktiv ? c.text : "#444" }}>
                  {aktiv ? "✓ " : ""}{m}
                </button>
              );
            })}
            {ausgewaehlt.length > 0 && (
              <button onClick={() => setAusgewaehlt([])} style={{ padding: "7px 14px", border: "1.5px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 12, background: "transparent", color: "#888" }}>
                Auswahl zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>

      <div style={sec}>
        <SectionLabel>Weitere Filter</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lb}>Typ</label><select style={sel} value={typ} onChange={(e) => setTyp(e.target.value)}><option value="">Alle</option><option value="angebot">Angebot</option><option value="anfrage">Anfrage</option></select></div>
          <div><label style={lb}>Spielstärke</label><select style={sel} value={staerke} onChange={(e) => setStaerke(e.target.value)}><option value="">Egal</option>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lb}>Datum ab</label><input type="date" style={sel} value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
          <div><label style={lb}>Rasen</label><select style={sel} value={rasen} onChange={(e) => setRasen(e.target.value)}><option value="">Egal</option>{["Naturrasen","Kunstrasen","Hartplatz","Halle"].map((r) => <option key={r}>{r}</option>)}</select></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lb}>Umkreis: <strong>{km} km</strong>{userLocation ? ` ab ${userLocation.label}` : " (kein Standort)"}</label>
          <input type="range" min={5} max={150} step={5} value={km} onChange={(e) => setKm(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#185FA5" }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={lb}>Sortierung</label>
          <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={reset} style={{ padding: 11, background: "white", color: "#555", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Zurücksetzen</button>
          <button onClick={search} style={{ padding: 11, background: "#185FA5", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Suchen</button>
        </div>
      </div>

      {results !== null && (
        <>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{results.length} {results.length === 1 ? "Ergebnis" : "Ergebnisse"} gefunden</div>
          {results.length === 0
            ? <div style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>Keine Spiele gefunden</div>
            : results.map((g) => <GameCard key={g.id} game={g} userLocation={userLocation} onClick={onSelectGame} />)
          }
        </>
      )}
    </div>
  );
}

// ─── Tab: Meine Spiele ─────────────────────────────────────────────────────────

function MeineTab({ games, userLocation, onSelectGame }) {
  const [sortBy, setSortBy] = useState("datum_asc");
  const gebucht = sortiereSpiele(games.filter((g) => g.status === "gebucht"), sortBy, userLocation);
  if (gebucht.length === 0) {
    return <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa" }}>Noch keine gebuchten Spiele.<br />Finde ein Spiel im Tab „Spiele"!</div>;
  }
  return (
    <div>
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
      {gebucht.map((g) => <GameCard key={g.id} game={g} userLocation={userLocation} onClick={onSelectGame} />)}
    </div>
  );
}

// ─── Haupt-App ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "liste", label: "Spiele" },
  { id: "neu",   label: "+ Eintragen" },
  { id: "suche", label: "Suchen" },
  { id: "meine", label: "Meine" },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("liste");
  const [games, setGames] = useState([]);
  const [laden, setLaden] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [bookingGame, setBookingGame] = useState(null);
  const [toast, setToast] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [showStandortModal, setShowStandortModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (!session) return; ladeSpiele(); }, [session]);

  async function ladeSpiele() {
    setLaden(true);
    const { data, error } = await supabase.from("games").select("*").order("created_at", { ascending: false });
    if (!error && data) setGames(data);
    setLaden(false);
  }

  if (!session) return <Login />;

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  async function handleAddGame(formData) {
    const { data, error } = await supabase.from("games").insert([{
      type: formData.type, mannschaft: formData.mannschaft, datum: formData.datum, uhrzeit: formData.uhrzeit,
      rasen: formData.rasen, staerke: formData.staerke, platz: formData.platz || null, adresse: formData.adresse || null,
      trainer_name: formData.trainer_name, telefon: formData.telefon, verein: formData.verein, status: "offen",
      umkreis_km: formData.umkreis_km || null, spielfeld_groesse: formData.spielfeld_groesse || null,
      spieldauer: formData.spieldauer ? parseInt(formData.spieldauer) : null, wichtige_infos: formData.wichtige_infos || null,
      lat: null, lng: null,
    }]).select();
    if (error) { alert("Fehler beim Speichern: " + error.message); return; }
    if (data) setGames((prev) => [data[0], ...prev]);
    showToast("Erfolgreich veröffentlicht!");
    setActiveTab("liste");
  }

  async function handleConfirmBooking(bookingData) {
    const { error } = await supabase.from("games").update({ status: "gebucht" }).eq("id", bookingGame.id);
    if (error) { alert("Fehler beim Buchen: " + error.message); return; }
    setGames((prev) => prev.map((g) => g.id === bookingGame.id ? { ...g, status: "gebucht" } : g));
    setBookingGame(null);
    showToast("Spiel gebucht!");
    setActiveTab("meine");
  }

  const currentGame = selectedGame ? games.find((g) => g.id === selectedGame.id) : null;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1rem", fontFamily: "system-ui, -apple-system, sans-serif", color: "#1a1a1a", background: "#f0f2f5", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ background: "white", border: "1.5px solid #e0e0e0", borderRadius: 14, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <div style={{ width: 36, height: 36, background: "#1D9E75", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>⚽</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>KickMatch</div>
          <div style={{ fontSize: 11, color: "#888" }}>Freundschaftsspiele koordinieren</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setShowStandortModal(true)}
            style={{ padding: "6px 11px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1.5px solid ${userLocation ? "#A8DFC4" : "#ddd"}`, borderRadius: 8, background: userLocation ? "#E1F5EE" : "white", color: userLocation ? "#085041" : "#555" }}>
            📍 {userLocation ? userLocation.label : "Standort"}
          </button>
          <button onClick={() => supabase.auth.signOut()}
            style={{ padding: "6px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: "1.5px solid #ddd", borderRadius: 8, background: "white", color: "#555" }}>
            Abmelden
          </button>
        </div>
      </div>

      <Toast message={toast} />

      {/* Tab-Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "white", borderRadius: 12, padding: 5, border: "1.5px solid #e0e0e0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: "9px 10px", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400, background: activeTab === tab.id ? "#1D9E75" : "transparent", color: activeTab === tab.id ? "white" : "#666", transition: "all .15s", boxShadow: activeTab === tab.id ? "0 2px 8px rgba(29,158,117,0.25)" : "none" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "liste" && <ListeTab games={games} userLocation={userLocation} laden={laden} onSelectGame={setSelectedGame} />}
      {activeTab === "neu" && <EintragenTab onSubmit={handleAddGame} />}
      {activeTab === "suche" && <SucheTab games={games} userLocation={userLocation} onSelectGame={setSelectedGame} />}
      {activeTab === "meine" && <MeineTab games={games} userLocation={userLocation} onSelectGame={setSelectedGame} />}

      {selectedGame && currentGame && (
        <DetailModal game={currentGame} userLocation={userLocation} onClose={() => setSelectedGame(null)} onBook={(g) => { setSelectedGame(null); setBookingGame(g); }} />
      )}
      {bookingGame && <BookingModal game={bookingGame} onClose={() => setBookingGame(null)} onConfirm={handleConfirmBooking} />}
      {showStandortModal && <StandortModal onClose={() => setShowStandortModal(false)} onSave={(loc) => { setUserLocation(loc); setShowStandortModal(false); showToast(`Standort: ${loc.label}`); }} />}
    </div>
  );
}
