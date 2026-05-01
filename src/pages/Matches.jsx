import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ─── Konstanten ────────────────────────────────────────────────────────────────

const MANNSCHAFTEN = {
  "Junioren": ["E-Jugend (U10)", "D-Jugend (U12)", "C-Jugend (U14)", "B-Jugend (U17)", "A-Jugend (U19)"],
  "Juniorinnen": ["E-Juniorinnen (U10)", "D-Juniorinnen (U12)", "C-Juniorinnen (U14)", "B-Juniorinnen (U17)", "A-Juniorinnen (U19)"],
  "Herren": ["Herren 1. Mannschaft", "Herren 2. Mannschaft", "Herren 3. Mannschaft", "Herren Ü32", "Herren Ü40", "Herren Ü50"],
  "Damen": ["Damen 1. Mannschaft", "Damen 2. Mannschaft", "Damen Ü32"],
};

const SPIELFELD_GROESSEN = ["Vollfeld (11 vs 11)", "Großfeld (9 vs 9)", "Mittelfeld (7 vs 7)", "Kleinfeld (5 vs 5)", "Futsal"];
const SCHIRI_LIZENZEN = ["DFB-Schiedsrichter (Kreisklasse)", "DFB-Schiedsrichter (Bezirksliga)", "DFB-Schiedsrichter (Landesliga)", "DFB-Schiedsrichter (Verbandsliga)", "FIFA-Schiedsrichter", "Sonstige"];

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

function sortiereSpiele(games, sortBy, userLocation) {
  const sorted = [...games];
  switch (sortBy) {
    case "datum_asc": return sorted.sort((a, b) => a.datum.localeCompare(b.datum));
    case "datum_desc": return sorted.sort((a, b) => b.datum.localeCompare(a.datum));
    case "neu": return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    case "entfernung":
      if (!userLocation) return sorted;
      return sorted.sort((a, b) => {
        const da = a.lat && a.lng ? haversine(userLocation.lat, userLocation.lng, a.lat, a.lng) : 9999;
        const db = b.lat && b.lng ? haversine(userLocation.lat, userLocation.lng, b.lat, b.lng) : 9999;
        return da - db;
      });
    case "staerke_asc": return sorted.sort((a, b) => a.staerke - b.staerke);
    case "staerke_desc": return sorted.sort((a, b) => b.staerke - a.staerke);
    default: return sorted;
  }
}

// ─── Design-Konstanten ─────────────────────────────────────────────────────────

const inp = { width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", background: "white" };
const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 };
const sec = { background: "white", border: "1.5px solid #e0e0e0", borderRadius: 12, padding: "1.25rem", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };

// ─── Hilfskomponenten ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{children}</div>;
}

function Badge({ children, variant = "gray" }) {
  const v = {
    offer:  { bg: "#E1F5EE", text: "#085041", border: "#A8DFC4" },
    search: { bg: "#EEEDFE", text: "#3C3489", border: "#C5C2F8" },
    green:  { bg: "#FCEBEB", text: "#791F1F", border: "#F09595" },
    gray:   { bg: "#F1EFE8", text: "#444441", border: "#D8D6CE" },
    orange: { bg: "#FAEEDA", text: "#633806", border: "#F0C98A" },
    blue:   { bg: "#E8F8F2", text: "#0C4D38", border: "#A8DFC4" },
    yellow: { bg: "#FFFBE6", text: "#7A5C00", border: "#F5D87A" },
    red:    { bg: "#FCEBEB", text: "#791F1F", border: "#F09595" },
  };
  const s = v[variant] || v.gray;
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{children}</span>;
}

function StrengthDots({ value }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: i <= value ? "#1D9E75" : "#ddd", border: i <= value ? "none" : "1px solid #ccc" }} />
      ))}
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return <div style={{ background: "#1D9E75", color: "white", padding: "12px 20px", borderRadius: 10, fontSize: 14, fontWeight: 500, marginBottom: 14, border: "1px solid #158F62", boxShadow: "0 2px 8px rgba(29,158,117,0.3)" }}>✓ {message}</div>;
}

function Ladeindikator() {
  return <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa", fontSize: 14 }}>Daten werden geladen...</div>;
}

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
          style={{ padding: "5px 12px", borderRadius: 20, border: `1.5px solid ${sortBy === o.val ? "#1D9E75" : "#ddd"}`, background: sortBy === o.val ? "#1D9E75" : "white", color: sortBy === o.val ? "white" : "#555", fontSize: 12, fontWeight: sortBy === o.val ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
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
          const stadt = data.address.city || data.address.town || data.address.village || "Unbekannt";
          onSave({ lat: latitude, lng: longitude, label: stadt });
        } catch { onSave({ lat: latitude, lng: longitude, label: "GPS-Standort" }); }
        setLoading(false);
      },
      () => { setError("GPS verweigert. Bitte manuell eingeben."); setLoading(false); }
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
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Mein Standort</div>
        <div style={{ fontSize: 13, color: "#777", marginBottom: 20 }}>Für Umkreissuche und Entfernungsanzeige</div>
        <button onClick={useGPS} disabled={loading} style={{ width: "100%", padding: 12, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
          {loading ? "Wird ermittelt..." : "📍 GPS-Standort verwenden"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} /><span style={{ fontSize: 12, color: "#aaa" }}>oder</span><div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
        </div>
        <input type="text" placeholder="z.B. Mannheim oder 68159" value={stadtInput} onChange={(e) => setStadtInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && useStadt()} style={{ ...inp, marginBottom: 10 }} />
        <button onClick={useStadt} disabled={loading} style={{ width: "100%", padding: 11, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Standort bestätigen</button>
        {error && <div style={{ marginTop: 12, padding: "8px 12px", background: "#FCEBEB", borderRadius: 8, fontSize: 13, color: "#791F1F" }}>{error}</div>}
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
          const c = kategorieColor(kat); const aktiv = aktiveKat === kat;
          return <button key={kat} onClick={() => { setAktiveKat(kat); onChange(MANNSCHAFTEN[kat][0]); }}
            style={{ flex: 1, padding: "7px 4px", border: aktiv ? `1px solid ${c.border}` : "1px solid transparent", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 600, background: aktiv ? c.bg : "transparent", color: aktiv ? c.text : "#888" }}>{kat}</button>;
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {MANNSCHAFTEN[aktiveKat].map((m) => {
          const aktiv = value === m; const c = kategorieColor(aktiveKat);
          return <button key={m} onClick={() => onChange(m)}
            style={{ padding: "10px 14px", border: `1.5px solid ${aktiv ? c.border : "#e5e5e5"}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: aktiv ? 600 : 400, textAlign: "left", background: aktiv ? c.bg : "white", color: aktiv ? c.text : "#444" }}>
            {aktiv ? "✓ " : ""}{m}</button>;
        })}
      </div>
    </div>
  );
}

// ─── Spielkarte ────────────────────────────────────────────────────────────────

function GameCard({ game, userLocation, onClick }) {
  const dist = userLocation && game.lat && game.lng ? haversine(userLocation.lat, userLocation.lng, game.lat, game.lng) : null;
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const c = kategorieColor(kat);

  return (
    <div onClick={() => onClick(game)}
      style={{ background: "white", border: "1.5px solid #e0e0e0", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 10, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#1D9E75"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(29,158,117,0.12)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e0e0e0"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Badge variant={game.type === "angebot" ? "offer" : "search"}>{game.type === "angebot" ? "⚽ Angebot" : "🔍 Anfrage"}</Badge>
          {kat && <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{kat}</span>}
          {game.status === "gebucht" && <Badge variant="green">Gebucht</Badge>}
          {game.schiri_benoetigt && <Badge variant="yellow">🟡 {game.schiri_status === "besetzt" ? "Schiri ✓" : "Schiri gesucht"}</Badge>}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0, marginLeft: 8 }}>
          {dist !== null && <Badge variant="gray">{dist} km</Badge>}
          <span style={{ fontSize: 12, color: "#777", fontWeight: 500 }}>{formatDate(game.datum)}</span>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>{game.verein}</div>
      <div style={{ fontSize: 13, color: "#555", fontWeight: 500, marginBottom: 8 }}>{mannschaft}</div>
      <div style={{ height: 1, background: "#f0f0f0", marginBottom: 8 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 12, color: "#666" }}>🕐 {game.uhrzeit} Uhr</span>
        {game.platz && <span style={{ fontSize: 12, color: "#666" }}>📍 {game.platz}</span>}
        <span style={{ fontSize: 12, color: "#666" }}>🌿 {game.rasen}</span>
        {game.spielfeld_groesse && <span style={{ fontSize: 12, color: "#666" }}>⬛ {game.spielfeld_groesse}</span>}
        {game.spieldauer && <span style={{ fontSize: 12, color: "#666" }}>⏱️ {game.spieldauer} min</span>}
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#888", fontWeight: 500 }}>Spielstärke:</span>
        <StrengthDots value={game.staerke} />
      </div>
      {game.wichtige_infos && (
        <div style={{ marginTop: 8, padding: "7px 10px", background: "#FAEEDA", borderRadius: 6, fontSize: 12, color: "#633806", border: "1px solid #F0C98A" }}>ℹ️ {game.wichtige_infos}</div>
      )}
    </div>
  );
}

// ─── Gebuchte Spielkarte ───────────────────────────────────────────────────────

function GebuchteSpielKarte({ game, buchung, userLocation, onClick }) {
  const dist = userLocation && game.lat && game.lng ? haversine(userLocation.lat, userLocation.lng, game.lat, game.lng) : null;
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const c = kategorieColor(kat);

  return (
    <div onClick={() => onClick(game)}
      style={{ background: "white", border: "1.5px solid #F09595", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 10, cursor: "pointer", boxShadow: "0 1px 4px rgba(240,149,149,0.15)" }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#e07070"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#F09595"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Badge variant="green">Gebucht</Badge>
          {kat && <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{kat}</span>}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
          {dist !== null && <Badge variant="gray">{dist} km</Badge>}
          <span style={{ fontSize: 12, color: "#777", fontWeight: 500 }}>{formatDate(game.datum)}</span>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", marginBottom: 2 }}>vs. {game.verein}</div>
      <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>{mannschaft}</div>
      <div style={{ height: 1, background: "#f0f0f0", marginBottom: 8 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#666" }}>🕐 {game.uhrzeit} Uhr</span>
        {game.platz && <span style={{ fontSize: 12, color: "#666" }}>📍 {game.platz}</span>}
        <span style={{ fontSize: 12, color: "#666" }}>🌿 {game.rasen}</span>
      </div>
      {buchung && (
        <div style={{ background: "#f8f8f8", borderRadius: 8, padding: "10px 12px", border: "1px solid #ebebeb" }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Kontakt Gegner</div>
          <div style={{ fontSize: 13, color: "#1a1a1a", fontWeight: 600, marginBottom: 2 }}>{buchung.anbieter_name}</div>
          <div style={{ fontSize: 13, color: "#1a1a1a", marginBottom: 2 }}>{buchung.anbieter_verein}</div>
          <div style={{ fontSize: 13, color: "#1D9E75", fontWeight: 500 }}>{buchung.anbieter_tel}</div>
        </div>
      )}
    </div>
  );
}

// ─── Schiri-Börsenkarte ────────────────────────────────────────────────────────

function SchiriBörsenKarte({ game, userLocation, onBewerben }) {
  const dist = userLocation && game.lat && game.lng ? haversine(userLocation.lat, userLocation.lng, game.lat, game.lng) : null;
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const c = kategorieColor(kat);
  return (
    <div style={{ background: "white", border: "1.5px solid #F5D87A", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 10, boxShadow: "0 1px 4px rgba(245,216,122,0.2)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Badge variant="yellow">🟡 Schiri gesucht</Badge>
          {kat && <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{kat}</span>}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {dist !== null && <Badge variant="gray">{dist} km</Badge>}
          <span style={{ fontSize: 12, color: "#777", fontWeight: 500 }}>{formatDate(game.datum)}</span>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>{game.verein}</div>
      <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>{mannschaft}</div>
      <div style={{ height: 1, background: "#f0f0f0", marginBottom: 8 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#666" }}>📅 {formatDate(game.datum)}</span>
        <span style={{ fontSize: 12, color: "#666" }}>🕐 {game.uhrzeit} Uhr</span>
        {game.platz && <span style={{ fontSize: 12, color: "#666" }}>📍 {game.platz}</span>}
        {game.spieldauer && <span style={{ fontSize: 12, color: "#666" }}>⏱️ {game.spieldauer} min</span>}
      </div>
      {game.schiri_status !== "besetzt" ? (
        <button onClick={() => onBewerben(game)} style={{ width: "100%", padding: 10, background: "#7A5C00", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          🟡 Als Schiedsrichter bewerben
        </button>
      ) : (
        <div style={{ textAlign: "center", padding: 8, background: "#EAF3DE", borderRadius: 8, fontSize: 13, color: "#27500A", fontWeight: 500 }}>✓ Schiedsrichter bereits bestätigt</div>
      )}
    </div>
  );
}

// ─── Benachrichtigungs-Banner ──────────────────────────────────────────────────

function BenachrichtigungenBanner({ session, onNavigateMeine }) {
  const [ungelesen, setUngelesen] = useState([]);

  useEffect(() => {
    if (!session) return;
    supabase.from("buchungen").select("*").eq("anbieter_email", session.user.email).eq("gelesen", false)
      .then(({ data }) => { if (data) setUngelesen(data); });
  }, [session]);

  async function allesGelesen() {
    const ids = ungelesen.map((b) => b.id);
    await supabase.from("buchungen").update({ gelesen: true }).in("id", ids);
    setUngelesen([]);
    onNavigateMeine();
  }

  if (ungelesen.length === 0) return null;

  return (
    <div style={{ background: "#E8F8F2", border: "1.5px solid #A8DFC4", borderRadius: 12, padding: "11px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 28, height: 28, background: "#1D9E75", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{ungelesen.length}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#085041", marginBottom: 2 }}>
          {ungelesen.length === 1 ? "1 Spiel wurde angenommen!" : `${ungelesen.length} Spiele wurden angenommen!`}
        </div>
        <div style={{ fontSize: 11, color: "#1D9E75" }}>{ungelesen.map((b) => `${b.bucher_verein} · ${b.datum}`).join(" | ")}</div>
      </div>
      <button onClick={allesGelesen} style={{ padding: "6px 12px", background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
        Ansehen
      </button>
    </div>
  );
}

// ─── Schiri-Bewerbungs-Modal ───────────────────────────────────────────────────

function SchiriBewerbungModal({ game, onClose, onConfirm }) {
  const [form, setForm] = useState({ name: "", telefon: "", lizenz: SCHIRI_LIZENZEN[0], nachricht: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.name || !form.telefon) { alert("Bitte Name und Telefon ausfüllen."); return; }
    setLoading(true);
    const { error } = await supabase.from("schiri_anfragen").insert([{
      game_id: game.id, schiri_name: form.name, schiri_tel: form.telefon,
      schiri_lizenz: form.lizenz, nachricht: form.nachricht || null, status: "offen",
    }]);
    if (error) { alert("Fehler: " + error.message); setLoading(false); return; }
    await supabase.from("games").update({ schiri_status: "angefragt" }).eq("id", game.id);
    onConfirm(); setLoading(false);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 101, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto", border: "1px solid #e0e0e0", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>🟡 Als Schiedsrichter bewerben</div>
        <div style={{ fontSize: 13, color: "#777", marginBottom: 16 }}>{game.verein} · {formatDate(game.datum)} · {game.uhrzeit} Uhr</div>
        {[
          { label: "Dein Name", key: "name", type: "text", placeholder: "Vor- und Nachname" },
          { label: "Deine Telefonnummer", key: "telefon", type: "tel", placeholder: "+49 ..." },
          { label: "Nachricht (optional)", key: "nachricht", type: "text", placeholder: "Erfahrung mit dieser Altersklasse..." },
        ].map((f) => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <label style={lbl}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} style={inp} />
          </div>
        ))}
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Lizenz</label>
          <select value={form.lizenz} onChange={(e) => setForm({ ...form, lizenz: e.target.value })} style={inp}>
            {SCHIRI_LIZENZEN.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: 13, background: "#7A5C00", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Wird gesendet..." : "Bewerbung absenden"}
        </button>
        <button onClick={onClose} style={{ width: "100%", padding: 10, background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: 13, marginTop: 6 }}>Abbrechen</button>
      </div>
    </div>
  );
}

// ─── Schiri-Anfragen-Modal ─────────────────────────────────────────────────────

function SchiriAnfragenModal({ game, onClose, onBestaetigen }) {
  const [anfragen, setAnfragen] = useState([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    supabase.from("schiri_anfragen").select("*").eq("game_id", game.id).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setAnfragen(data); setLaden(false); });
  }, [game.id]);

  async function bestaetigen(anfrage) {
    await supabase.from("schiri_anfragen").update({ status: "bestaetigt" }).eq("id", anfrage.id);
    await supabase.from("games").update({ schiri_status: "besetzt" }).eq("id", game.id);
    onBestaetigen();
  }

  async function ablehnen(anfrage) {
    await supabase.from("schiri_anfragen").update({ status: "abgelehnt" }).eq("id", anfrage.id);
    setAnfragen((prev) => prev.map((a) => a.id === anfrage.id ? { ...a, status: "abgelehnt" } : a));
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 102, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 480, width: "100%", maxHeight: "85vh", overflowY: "auto", border: "1px solid #e0e0e0", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", border: "1px solid #e0e0e0", background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>✕</button>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>🟡 Schiedsrichter-Bewerbungen</div>
        <div style={{ fontSize: 13, color: "#777", marginBottom: 16 }}>{game.verein} · {formatDate(game.datum)}</div>
        {laden ? <Ladeindikator /> : anfragen.length === 0
          ? <div style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>Noch keine Bewerbungen.</div>
          : anfragen.map((a) => (
            <div key={a.id} style={{ background: "#f8f8f8", border: `1.5px solid ${a.status === "bestaetigt" ? "#B8DCA0" : a.status === "abgelehnt" ? "#F09595" : "#e0e0e0"}`, borderRadius: 10, padding: "1rem", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{a.schiri_name}</div>
                {a.status === "bestaetigt" && <Badge variant="blue">✓ Bestätigt</Badge>}
                {a.status === "abgelehnt" && <Badge variant="red">✗ Abgelehnt</Badge>}
                {a.status === "offen" && <Badge variant="yellow">Offen</Badge>}
              </div>
              <div style={{ fontSize: 13, color: "#1D9E75", marginBottom: 4 }}>{a.schiri_tel}</div>
              {a.schiri_lizenz && <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>🟡 {a.schiri_lizenz}</div>}
              {a.nachricht && <div style={{ fontSize: 12, color: "#666", fontStyle: "italic", marginBottom: 8 }}>"{a.nachricht}"</div>}
              {a.status === "offen" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => ablehnen(a)} style={{ padding: 8, background: "white", color: "#791F1F", border: "1.5px solid #F09595", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Ablehnen</button>
                  <button onClick={() => bestaetigen(a)} style={{ padding: 8, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✓ Bestätigen</button>
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ─── Detail-Modal ──────────────────────────────────────────────────────────────

function DetailModal({ game, userLocation, session, onClose, onBook, onRefresh }) {
  const [showSchiriAnfragen, setShowSchiriAnfragen] = useState(false);
  if (!game) return null;
  const dist = userLocation && game.lat && game.lng ? haversine(userLocation.lat, userLocation.lng, game.lat, game.lng) : null;
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const c = kategorieColor(kat);
  const mapsUrl = game.adresse ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(game.adresse)}` : null;
  const istSchiri = session?.user?.user_metadata?.rolle === "schiedsrichter";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto", position: "relative", border: "1px solid #e0e0e0", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", border: "1px solid #e0e0e0", background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>✕</button>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
            <Badge variant={game.type === "angebot" ? "offer" : "search"}>{game.type === "angebot" ? "⚽ Angebot" : "🔍 Anfrage"}</Badge>
            {kat && <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{kat}</span>}
            {game.status === "gebucht" && <Badge variant="green">Gebucht</Badge>}
            {dist !== null && <Badge variant="gray">{dist} km</Badge>}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 2 }}>{game.verein}</div>
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
              <div key={row.label} style={{ display: "flex", gap: 12, padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid #ebebeb" : "none" }}>
                <div style={{ fontSize: 15, width: 22, flexShrink: 0 }}>{row.icon}</div>
                <div>
                  <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{row.label}</div>
                  <div style={{ fontSize: 14, color: row.label === "Telefon" ? "#1D9E75" : "#1a1a1a", marginTop: 2 }}>{row.value}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: "#f8f8f8", borderRadius: 10, border: "1px solid #ebebeb", padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 15 }}>💪</span>
            <div>
              <div style={{ fontSize: 10, color: "#999", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Spielstärke</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}><StrengthDots value={game.staerke} /><span style={{ fontSize: 13, color: "#555" }}>Stufe {game.staerke} von 5</span></div>
            </div>
          </div>
          {game.schiri_benoetigt && (
            <div style={{ background: "#FFFBE6", border: "1.5px solid #F5D87A", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#7A5C00", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>🟡 Schiedsrichter</div>
              <div style={{ fontSize: 14, color: "#7A5C00" }}>
                {game.schiri_status === "besetzt" ? "✓ Schiedsrichter ist bestätigt" :
                  game.schiri_status === "angefragt" ? "Bewerbungen eingegangen — Trainer prüft" :
                    "Noch kein Schiedsrichter — Bewerbungen willkommen"}
              </div>
            </div>
          )}
          {game.wichtige_infos && (
            <div style={{ background: "#FAEEDA", border: "1.5px solid #F0C98A", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#633806", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5 }}>ℹ️ Wichtige Infos</div>
              <div style={{ fontSize: 14, color: "#633806", lineHeight: 1.6 }}>{game.wichtige_infos}</div>
            </div>
          )}
          {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", padding: 11, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, marginBottom: 8, textAlign: "center", textDecoration: "none" }}>🗺️ Navigation starten</a>}
          {game.schiri_benoetigt && game.schiri_status === "angefragt" && !istSchiri && (
            <button onClick={() => setShowSchiriAnfragen(true)} style={{ width: "100%", padding: 11, background: "#FFFBE6", color: "#7A5C00", border: "1.5px solid #F5D87A", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>
              🟡 Schiedsrichter-Bewerbungen ansehen
            </button>
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
      {showSchiriAnfragen && (
        <SchiriAnfragenModal game={game} onClose={() => setShowSchiriAnfragen(false)} onBestaetigen={() => { setShowSchiriAnfragen(false); onRefresh(); onClose(); }} />
      )}
    </>
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
      <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto", border: "1px solid #e0e0e0", boxShadow: "0 8px 32px rgba(0,0,0,0.15)" }}>
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Buchung abschließen</div>
        <div style={{ fontSize: 13, color: "#777", marginBottom: 16 }}>{game.verein} · {formatDate(game.datum)} · {game.uhrzeit} Uhr</div>
        {[
          { label: "Dein Name", key: "name", type: "text", placeholder: "Vor- und Nachname" },
          { label: "Dein Verein", key: "verein", type: "text", placeholder: "z.B. FC Musterstadt" },
          { label: "Telefonnummer", key: "tel", type: "tel", placeholder: "+49 ..." },
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

const FILTER_KAT = ["Alle", "Angebote", "Anfragen", "Junioren", "Juniorinnen", "Herren", "Damen", "Schiri gesucht"];

function ListeTab({ games, userLocation, laden, onSelectGame }) {
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [sortBy, setSortBy] = useState("neu");

  const filtered = games.filter((g) => {
    const m = g.mannschaft || g.jugend || "";
    if (activeFilter === "Alle") return true;
    if (activeFilter === "Angebote") return g.type === "angebot";
    if (activeFilter === "Anfragen") return g.type === "anfrage";
    if (activeFilter === "Schiri gesucht") return g.schiri_benoetigt && g.schiri_status !== "besetzt";
    return getKategorie(m) === activeFilter;
  });
  const sortiert = sortiereSpiele(filtered, sortBy, userLocation);

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
        {FILTER_KAT.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            style={{ padding: "6px 13px", borderRadius: 20, border: `1.5px solid ${activeFilter === f ? "#1D9E75" : "#ddd"}`, background: activeFilter === f ? "#1D9E75" : "white", color: activeFilter === f ? "white" : "#555", fontSize: 12, fontWeight: activeFilter === f ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap" }}>
            {f}
          </button>
        ))}
      </div>
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
      {!laden && sortiert.length > 0 && <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{sortiert.length} {sortiert.length === 1 ? "Eintrag" : "Einträge"}</div>}
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
  const [schiriBenoetigt, setSchiriBenoetigt] = useState(false);
  const [laden, setLaden] = useState(false);
  const [form, setForm] = useState({ datum: "", uhrzeit: "10:00", rasen: "Naturrasen", platz: "", adresse: "", trainer_name: "", telefon: "", verein: "", spielfeld_groesse: "", spieldauer: "", wichtige_infos: "" });

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  async function handleSubmit() {
    if (!form.datum || !form.trainer_name || !form.verein) { alert("Bitte Datum, Name und Verein ausfüllen."); return; }
    setLaden(true);
    await onSubmit({ ...form, type, mannschaft, staerke, umkreis_km: type === "anfrage" ? umkreis : null, schiri_benoetigt: schiriBenoetigt, schiri_status: schiriBenoetigt ? "offen" : null });
    setForm({ datum: "", uhrzeit: "10:00", rasen: "Naturrasen", platz: "", adresse: "", trainer_name: "", telefon: "", verein: "", spielfeld_groesse: "", spieldauer: "", wichtige_infos: "" });
    setType("angebot"); setMannschaft("E-Jugend (U10)"); setStaerke(3); setUmkreis(30); setSchiriBenoetigt(false);
    setLaden(false);
  }

  return (
    <div>
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

      <div style={sec}><SectionLabel>Mannschaft</SectionLabel><MannschaftAuswahl value={mannschaft} onChange={setMannschaft} /></div>

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
          <label style={lbl}>Spielstärke</label>
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

      <div style={sec}>
        <SectionLabel>Schiedsrichter</SectionLabel>
        <label style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
          <div onClick={() => setSchiriBenoetigt(!schiriBenoetigt)}
            style={{ width: 44, height: 24, borderRadius: 12, background: schiriBenoetigt ? "#1D9E75" : "#ddd", position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: schiriBenoetigt ? 22 : 2, transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Schiedsrichter wird benötigt</div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>Das Spiel erscheint in der Schiri-Börse</div>
          </div>
        </label>
      </div>

      <div style={sec}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <SectionLabel>Weitere Angaben</SectionLabel>
          <span style={{ fontSize: 10, background: "#f0f0f0", color: "#888", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>OPTIONAL</span>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Spielfeldgröße</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SPIELFELD_GROESSEN.map((g) => {
              const aktiv = form.spielfeld_groesse === g;
              return <button key={g} onClick={() => set("spielfeld_groesse", aktiv ? "" : g)}
                style={{ padding: "7px 12px", borderRadius: 8, border: `1.5px solid ${aktiv ? "#1D9E75" : "#ddd"}`, background: aktiv ? "#E8F8F2" : "white", color: aktiv ? "#0C4D38" : "#555", fontSize: 12, cursor: "pointer", fontWeight: aktiv ? 600 : 400 }}>
                {aktiv ? "✓ " : ""}{g}</button>;
            })}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Spieldauer (Minuten)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {[40, 50, 60, 70, 80, 90].map((min) => {
              const aktiv = parseInt(form.spieldauer) === min;
              return <button key={min} onClick={() => set("spieldauer", aktiv ? "" : min)}
                style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${aktiv ? "#1D9E75" : "#ddd"}`, background: aktiv ? "#E1F5EE" : "white", color: aktiv ? "#085041" : "#555", fontSize: 12, cursor: "pointer", fontWeight: aktiv ? 600 : 400 }}>
                {aktiv ? "✓ " : ""}{min} min</button>;
            })}
          </div>
          <input type="number" placeholder="Eigene Dauer..." min={10} max={180} value={form.spieldauer} onChange={(e) => set("spieldauer", e.target.value)} style={{ ...inp, fontSize: 13 }} />
        </div>
        <div>
          <label style={lbl}>Wichtige Infos</label>
          <textarea placeholder="z.B. Trikotfarbe, Parkplätze, Umkleiden..." value={form.wichtige_infos} onChange={(e) => set("wichtige_infos", e.target.value)} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
        </div>
      </div>

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

      <div style={sec}>
        <SectionLabel>{type === "angebot" ? "Ort" : "Dein Standort"}</SectionLabel>
        {type === "angebot" ? (
          <>
            <div style={{ marginBottom: 10 }}><label style={lbl}>Sportplatz Name</label><input type="text" style={inp} placeholder="z.B. Sportpark Nord" value={form.platz} onChange={(e) => set("platz", e.target.value)} /></div>
            <div><label style={lbl}>Adresse</label><input type="text" style={inp} placeholder="Musterstr. 1, 68159 Mannheim" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} /></div>
          </>
        ) : (
          <div><label style={lbl}>Stadt / PLZ</label><input type="text" style={inp} placeholder="z.B. Mannheim oder 68159" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} /></div>
        )}
      </div>

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

// ─── Tab: Schiri-Börse ─────────────────────────────────────────────────────────

function SchiriBörseTab({ games, userLocation, session, onRefresh }) {
  const [sortBy, setSortBy] = useState("datum_asc");
  const [bewerbungGame, setBewerbungGame] = useState(null);
  const [toast, setToast] = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }

  const offeneSpiele = sortiereSpiele(games.filter((g) => g.schiri_benoetigt && g.schiri_status !== "besetzt"), sortBy, userLocation);

  return (
    <div>
      <div style={{ background: "#FFFBE6", border: "1.5px solid #F5D87A", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13, color: "#7A5C00" }}>🟡 Schiedsrichter-Börse</div>
        <div style={{ fontSize: 12, color: "#856A00" }}>Alle Spiele die einen Schiedsrichter suchen.</div>
      </div>
      {toast && <div style={{ background: "#1D9E75", color: "white", padding: "10px 16px", borderRadius: 8, marginBottom: 12, fontSize: 13, fontWeight: 500 }}>✓ {toast}</div>}
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
      {offeneSpiele.length === 0
        ? <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa" }}>Aktuell keine Spiele mit Schiedsrichter-Bedarf.</div>
        : offeneSpiele.map((g) => <SchiriBörsenKarte key={g.id} game={g} userLocation={userLocation} onBewerben={setBewerbungGame} />)
      }
      {bewerbungGame && <SchiriBewerbungModal game={bewerbungGame} onClose={() => setBewerbungGame(null)} onConfirm={() => { setBewerbungGame(null); showToast("Bewerbung erfolgreich gesendet!"); onRefresh(); }} />}
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

  return (
    <div>
      {!userLocation && <div style={{ background: "#FAEEDA", border: "1.5px solid #F0C98A", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#633806", fontWeight: 500 }}>⚠️ Kein Standort gesetzt.</div>}
      <div style={sec}>
        <SectionLabel>Mannschaft</SectionLabel>
        <div style={{ display: "flex", gap: 4, marginBottom: 10, background: "#f0f2f5", borderRadius: 10, padding: 4 }}>
          {["Alle", ...Object.keys(MANNSCHAFTEN)].map((kat) => {
            const c = kategorieColor(kat); const aktiv = aktiveKat === kat;
            const hat = kat !== "Alle" && ausgewaehlt.some((m) => getKategorie(m) === kat);
            return <button key={kat} onClick={() => { setAktiveKat(kat); if (kat === "Alle") setAusgewaehlt([]); }}
              style={{ flex: 1, padding: "7px 4px", border: aktiv ? `1.5px solid ${kat === "Alle" ? "#1D9E75" : c.border}` : "1.5px solid transparent", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 600, background: aktiv ? (kat === "Alle" ? "#1D9E75" : c.bg) : "transparent", color: aktiv ? (kat === "Alle" ? "white" : c.text) : "#888" }}>
              {kat}{hat && <span style={{ display: "inline-block", width: 5, height: 5, background: c.text, borderRadius: "50%", marginLeft: 3, verticalAlign: "middle" }} />}
            </button>;
          })}
        </div>
        {aktiveKat !== "Alle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {MANNSCHAFTEN[aktiveKat].map((m) => {
              const aktiv = ausgewaehlt.includes(m); const c = kategorieColor(aktiveKat);
              return <button key={m} onClick={() => toggleM(m)}
                style={{ padding: "10px 14px", border: `1.5px solid ${aktiv ? c.border : "#e5e5e5"}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: aktiv ? 600 : 400, textAlign: "left", background: aktiv ? c.bg : "white", color: aktiv ? c.text : "#444" }}>
                {aktiv ? "✓ " : ""}{m}</button>;
            })}
            {ausgewaehlt.length > 0 && <button onClick={() => setAusgewaehlt([])} style={{ padding: "7px 14px", border: "1.5px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 12, background: "transparent", color: "#888" }}>Auswahl zurücksetzen</button>}
          </div>
        )}
      </div>
      <div style={sec}>
        <SectionLabel>Weitere Filter</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Typ</label><select style={inp} value={typ} onChange={(e) => setTyp(e.target.value)}><option value="">Alle</option><option value="angebot">Angebot</option><option value="anfrage">Anfrage</option></select></div>
          <div><label style={lbl}>Spielstärke</label><select style={inp} value={staerke} onChange={(e) => setStaerke(e.target.value)}><option value="">Egal</option>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Datum ab</label><input type="date" style={inp} value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
          <div><label style={lbl}>Rasen</label><select style={inp} value={rasen} onChange={(e) => setRasen(e.target.value)}><option value="">Egal</option>{["Naturrasen","Kunstrasen","Hartplatz","Halle"].map((r) => <option key={r}>{r}</option>)}</select></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Umkreis: <strong>{km} km</strong>{userLocation ? ` ab ${userLocation.label}` : ""}</label>
          <input type="range" min={5} max={150} step={5} value={km} onChange={(e) => setKm(parseInt(e.target.value))} style={{ width: "100%", accentColor: "#1D9E75" }} />
        </div>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Sortierung</label><SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={reset} style={{ padding: 11, background: "white", color: "#555", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>Zurücksetzen</button>
          <button onClick={search} style={{ padding: 11, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Suchen</button>
        </div>
      </div>
      {results !== null && (
        <>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{results.length} {results.length === 1 ? "Ergebnis" : "Ergebnisse"}</div>
          {results.length === 0 ? <div style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>Keine Spiele gefunden</div>
            : results.map((g) => <GameCard key={g.id} game={g} userLocation={userLocation} onClick={onSelectGame} />)}
        </>
      )}
    </div>
  );
}

// ─── Tab: Meine Spiele ─────────────────────────────────────────────────────────

function MeineTab({ userLocation, onSelectGame, session }) {
  const [sortBy, setSortBy] = useState("datum_asc");
  const [meineSpiele, setMeineSpiele] = useState([]);
  const [meineBuchungen, setMeineBuchungen] = useState([]);
  const [laden, setLaden] = useState(true);

  useEffect(() => {
    async function ladeMeine() {
      const { data: buchungen } = await supabase.from("buchungen").select("*").eq("bucher_email", session.user.email);
      if (!buchungen || buchungen.length === 0) { setLaden(false); return; }
      const gameIds = buchungen.map((b) => b.game_id);
      const { data: spiele } = await supabase.from("games").select("*").in("id", gameIds);
      if (spiele) setMeineSpiele(spiele);
      setMeineBuchungen(buchungen);
      setLaden(false);
    }
    ladeMeine();
  }, [session]);

  const sortiert = sortiereSpiele(meineSpiele, sortBy, userLocation);
  if (laden) return <Ladeindikator />;
  if (sortiert.length === 0) return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa" }}>
      Noch keine gebuchten Spiele.<br />Finde ein Spiel im Tab „Spiele"!
    </div>
  );

  return (
    <div>
      <div style={{ background: "#FCEBEB", border: "1.5px solid #F09595", borderRadius: 12, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#791F1F" }}>
        <strong>{sortiert.length} gebuchte {sortiert.length === 1 ? "Spiel" : "Spiele"}</strong> — Kontaktdaten direkt sichtbar.
      </div>
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
      {sortiert.map((g) => {
        const buchung = meineBuchungen.find((b) => b.game_id === g.id);
        return <GebuchteSpielKarte key={g.id} game={g} buchung={buchung} userLocation={userLocation} onClick={onSelectGame} />;
      })}
    </div>
  );
}

// ─── Hauptkomponente ───────────────────────────────────────────────────────────

export default function Matches() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("liste");
  const [games, setGames] = useState([]);
  const [laden, setLaden] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [bookingGame, setBookingGame] = useState(null);
  const [toast, setToast] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [showStandortModal, setShowStandortModal] = useState(false);

  const rolle = session?.user?.user_metadata?.rolle || "trainer";
  const istSchiri = rolle === "schiedsrichter";

  const TABS = istSchiri
    ? [{ id: "liste", label: "Spiele" }, { id: "boerse", label: "🟡 Börse" }, { id: "suche", label: "Suchen" }]
    : [{ id: "liste", label: "Spiele" }, { id: "neu", label: "+ Eintragen" }, { id: "suche", label: "Suchen" }, { id: "boerse", label: "🟡 Schiri" }, { id: "meine", label: "Meine" }];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => { if (session) ladeSpiele(); }, [session]);

  async function ladeSpiele() {
    setLaden(true);
    const { data, error } = await supabase.from("games").select("*").order("created_at", { ascending: false });
    if (!error && data) setGames(data);
    setLaden(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleAddGame(formData) {
    const { data, error } = await supabase.from("games").insert([{
      type: formData.type, mannschaft: formData.mannschaft, datum: formData.datum, uhrzeit: formData.uhrzeit,
      rasen: formData.rasen, staerke: formData.staerke, platz: formData.platz || null, adresse: formData.adresse || null,
      trainer_name: formData.trainer_name, telefon: formData.telefon, verein: formData.verein, status: "offen",
      umkreis_km: formData.umkreis_km || null, spielfeld_groesse: formData.spielfeld_groesse || null,
      spieldauer: formData.spieldauer ? parseInt(formData.spieldauer) : null, wichtige_infos: formData.wichtige_infos || null,
      schiri_benoetigt: formData.schiri_benoetigt || false, schiri_status: formData.schiri_status || null,
      lat: null, lng: null,
    }]).select();
    if (error) { alert("Fehler: " + error.message); return; }
    if (data) setGames((prev) => [data[0], ...prev]);
    showToast("Erfolgreich veröffentlicht!");
    setActiveTab("liste");
  }

  async function handleConfirmBooking(bookingData) {
    const { error: updateError } = await supabase.from("games").update({ status: "gebucht" }).eq("id", bookingGame.id);
    if (updateError) { alert("Fehler: " + updateError.message); return; }
    await supabase.from("buchungen").insert([{
      game_id: bookingGame.id,
      anbieter_name: bookingGame.trainer_name, anbieter_tel: bookingGame.telefon,
      anbieter_verein: bookingGame.verein, anbieter_email: bookingGame.anbieter_email || "",
      bucher_name: bookingData.name, bucher_verein: bookingData.verein,
      bucher_tel: bookingData.tel, bucher_mannschaft: bookingData.mannschaft || null,
      bucher_nachricht: bookingData.msg || null, bucher_email: session.user.email,
      datum: formatDate(bookingGame.datum), uhrzeit: bookingGame.uhrzeit, gelesen: false,
    }]);
    setGames((prev) => prev.map((g) => g.id === bookingGame.id ? { ...g, status: "gebucht" } : g));
    setBookingGame(null);
    showToast("Spiel erfolgreich gebucht!");
    setActiveTab("meine");
  }

  const currentGame = selectedGame ? games.find((g) => g.id === selectedGame.id) : null;

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1rem", color: "#1a1a1a" }}>

      {/* Standort-Leiste */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button onClick={() => setShowStandortModal(true)}
          style={{ padding: "6px 11px", fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1.5px solid ${userLocation ? "#A8DFC4" : "#ddd"}`, borderRadius: 8, background: userLocation ? "#E1F5EE" : "white", color: userLocation ? "#085041" : "#555" }}>
          📍 {userLocation ? userLocation.label : "Standort setzen"}
        </button>
      </div>

      {/* Benachrichtigung */}
      {!istSchiri && session && <BenachrichtigungenBanner session={session} onNavigateMeine={() => setActiveTab("meine")} />}

      <Toast message={toast} />

      {/* Tab-Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "white", borderRadius: 12, padding: 5, border: "1.5px solid #e0e0e0", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ flex: 1, padding: "9px 8px", border: "none", borderRadius: 9, cursor: "pointer", fontSize: 12, fontWeight: activeTab === tab.id ? 700 : 400, background: activeTab === tab.id ? "#1D9E75" : "transparent", color: activeTab === tab.id ? "white" : "#666", transition: "all .15s" }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "liste" && <ListeTab games={games} userLocation={userLocation} laden={laden} onSelectGame={setSelectedGame} />}
      {activeTab === "neu" && !istSchiri && <EintragenTab onSubmit={handleAddGame} />}
      {activeTab === "suche" && <SucheTab games={games} userLocation={userLocation} onSelectGame={setSelectedGame} />}
      {activeTab === "boerse" && <SchiriBörseTab games={games} userLocation={userLocation} session={session} onRefresh={ladeSpiele} />}
      {activeTab === "meine" && !istSchiri && session && <MeineTab userLocation={userLocation} onSelectGame={setSelectedGame} session={session} />}

      {selectedGame && currentGame && (
        <DetailModal game={currentGame} userLocation={userLocation} session={session} onClose={() => setSelectedGame(null)} onBook={(g) => { setSelectedGame(null); setBookingGame(g); }} onRefresh={ladeSpiele} />
      )}
      {bookingGame && <BookingModal game={bookingGame} onClose={() => setBookingGame(null)} onConfirm={handleConfirmBooking} />}
      {showStandortModal && <StandortModal onClose={() => setShowStandortModal(false)} onSave={(loc) => { setUserLocation(loc); setShowStandortModal(false); showToast(`Standort: ${loc.label}`); }} />}
    </div>
  );
}
