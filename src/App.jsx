import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

// ─── Konstanten ────────────────────────────────────────────────────────────────

const MANNSCHAFTEN = {
  "Junioren": ["E-Jugend (U10)", "D-Jugend (U12)", "C-Jugend (U14)", "B-Jugend (U17)", "A-Jugend (U19)"],
  "Juniorinnen": ["E-Juniorinnen (U10)", "D-Juniorinnen (U12)", "C-Juniorinnen (U14)", "B-Juniorinnen (U17)", "A-Juniorinnen (U19)"],
  "Herren": ["Herren 1. Mannschaft", "Herren 2. Mannschaft", "Herren 3. Mannschaft", "Herren Ü32", "Herren Ü40", "Herren Ü50"],
  "Damen": ["Damen 1. Mannschaft", "Damen 2. Mannschaft", "Damen Ü32"],
};

const SPIELFELD_GROESSEN = ["Vollfeld (11 vs 11)", "Großfeld (9 vs 9)", "Mittelfeld (7 vs 7)", "Kleinfeld (5 vs 5)", "Futsal"];
const SCHIRI_LIZENZEN = ["DFB-Schiedsrichter (Kreisklasse)", "DFB-Schiedsrichter (Bezirksliga)", "DFB-Schiedsrichter (Landesliga)", "DFB-Schiedsrichter (Verbandsliga)", "FIFA-Schiedsrichter", "Sonstige"];

// ─── Design Tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:       "#000000",
  card:     "#1C1C1E",
  card2:    "#2C2C2E",
  border:   "#3A3A3C",
  accent:   "#30D158",
  accentDim:"rgba(48,209,88,0.15)",
  text:     "#FFFFFF",
  textSub:  "#C7C7CC",   // war #8E8E93 — deutlich heller
  textDim:  "#98989D",   // war #48484A — deutlich heller
};

// Kategorie-Akzentfarben (iOS-Stil)
const KAT_COLORS = {
  "Junioren":    { accent: "#0A84FF", dim: "rgba(10,132,255,0.15)", label: "#0A84FF" },
  "Juniorinnen": { accent: "#FF9F0A", dim: "rgba(255,159,10,0.15)", label: "#FF9F0A" },
  "Herren":      { accent: "#30D158", dim: "rgba(48,209,88,0.15)",  label: "#30D158" },
  "Damen":       { accent: "#BF5AF2", dim: "rgba(191,90,242,0.15)", label: "#BF5AF2" },
};

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

// ─── Design-Hilfsfunktionen ────────────────────────────────────────────────────

const inp = {
  width: "100%", padding: "10px 12px", border: `1px solid ${C.border}`,
  borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box",
  background: C.card, color: C.text,
};
const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 5 };
const sec = {
  background: C.card, border: `0.5px solid ${C.border}`,
  borderRadius: 14, padding: "1.25rem", marginBottom: 12,
};

function Pill({ children, color, dim }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px",
      borderRadius: 20, fontSize: 10, fontWeight: 700,
      letterSpacing: "0.03em",
      background: dim || "rgba(255,255,255,0.08)",
      color: color || C.textSub,
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
      {children}
    </div>
  );
}

function StrengthDots({ value }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i <= value ? C.accent : C.card2 }} />
      ))}
    </div>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{ background: C.accent, color: "#000", padding: "11px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
      ✓ {message}
    </div>
  );
}

function Ladeindikator() {
  return <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.textDim, fontSize: 13 }}>Wird geladen...</div>;
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
      <span style={{ fontSize: 10, fontWeight: 600, color: C.textDim, whiteSpace: "nowrap", alignSelf: "center", textTransform: "uppercase", letterSpacing: "0.06em" }}>Sort:</span>
      {optionen.map((o) => (
        <button key={o.val} onClick={() => onChange(o.val)} style={{
          padding: "4px 11px", borderRadius: 20, border: "none",
          background: sortBy === o.val ? C.accent : C.card2,
          color: sortBy === o.val ? "#000" : C.textSub,
          fontSize: 11, fontWeight: sortBy === o.val ? 700 : 500,
          cursor: "pointer", whiteSpace: "nowrap",
        }}>
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 18, padding: "1.5rem", maxWidth: 360, width: "100%", border: `0.5px solid ${C.border}` }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>Mein Standort</div>
        <div style={{ fontSize: 13, color: C.textSub, marginBottom: 20 }}>Für Umkreissuche und Entfernung</div>
        <button onClick={useGPS} disabled={loading} style={{ width: "100%", padding: 12, background: C.accent, color: "#000", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>
          {loading ? "Wird ermittelt..." : "📍 GPS verwenden"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} /><span style={{ fontSize: 11, color: C.textDim }}>oder</span><div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        <input type="text" placeholder="z.B. Mannheim oder 68159" value={stadtInput} onChange={(e) => setStadtInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && useStadt()}
          style={{ ...inp, marginBottom: 10 }} />
        <button onClick={useStadt} disabled={loading} style={{ width: "100%", padding: 11, background: C.card2, color: C.text, border: "none", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Bestätigen</button>
        {error && <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(255,59,48,0.15)", borderRadius: 8, fontSize: 13, color: "#FF453A" }}>{error}</div>}
      </div>
    </div>
  );
}

// ─── Mannschafts-Auswahl ───────────────────────────────────────────────────────

function MannschaftAuswahl({ value, onChange }) {
  const [aktiveKat, setAktiveKat] = useState(() => getKategorie(value) || "Junioren");
  const katKeys = Object.keys(MANNSCHAFTEN);
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10, background: C.card2, borderRadius: 10, padding: 3 }}>
        {katKeys.map((kat) => {
          const kc = KAT_COLORS[kat] || {};
          const aktiv = aktiveKat === kat;
          return (
            <button key={kat} onClick={() => { setAktiveKat(kat); onChange(MANNSCHAFTEN[kat][0]); }}
              style={{ flex: 1, padding: "6px 4px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 11, fontWeight: 700, background: aktiv ? kc.dim : "transparent", color: aktiv ? kc.accent : C.textDim }}>
              {kat}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {MANNSCHAFTEN[aktiveKat].map((m) => {
          const aktiv = value === m;
          const kc = KAT_COLORS[aktiveKat] || {};
          return (
            <button key={m} onClick={() => onChange(m)} style={{
              padding: "10px 14px", border: `0.5px solid ${aktiv ? kc.accent : C.border}`,
              borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: aktiv ? 700 : 400,
              textAlign: "left", background: aktiv ? kc.dim : "transparent",
              color: aktiv ? kc.accent : C.textSub,
              borderLeft: aktiv ? `3px solid ${kc.accent}` : `3px solid transparent`,
            }}>
              {aktiv ? "✓ " : ""}{m}
            </button>
          );
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
  const kc = KAT_COLORS[kat] || { accent: C.accent, dim: C.accentDim };
  const isAngebot = game.type === "angebot";

  return (
    <div onClick={() => onClick(game)} style={{
      background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 14,
      padding: "12px 14px", marginBottom: 8, cursor: "pointer",
      borderLeft: `3px solid ${kc.accent}`,
      position: "relative", overflow: "hidden",
    }}>
      {/* Obere Zeile */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          <Pill color={isAngebot ? C.accent : "#FF9F0A"} dim={isAngebot ? C.accentDim : "rgba(255,159,10,0.15)"}>
            {isAngebot ? "ANGEBOT" : "ANFRAGE"}
          </Pill>
          {kat && <Pill color={kc.accent} dim={kc.dim}>{kat.toUpperCase()}</Pill>}
          {game.status === "gebucht" && <Pill color="#FF453A" dim="rgba(255,69,58,0.15)">GEBUCHT</Pill>}
          {game.schiri_benoetigt && game.schiri_status !== "besetzt" && <Pill color="#FF9F0A" dim="rgba(255,159,10,0.12)">SCHIRI GESUCHT</Pill>}
          {game.schiri_benoetigt && game.schiri_status === "besetzt" && <Pill color={C.accent} dim={C.accentDim}>SCHIRI ✓</Pill>}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
          {dist !== null && <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{dist} km</span>}
          <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{formatDate(game.datum)}</span>
        </div>
      </div>

      {/* Name */}
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 1, letterSpacing: "-0.3px" }}>{game.verein}</div>
      <div style={{ fontSize: 12, color: kc.accent, fontWeight: 700, marginBottom: 8, letterSpacing: "0.02em" }}>{mannschaft}</div>

      {/* Trennlinie */}
      <div style={{ height: 1, background: C.card2, marginBottom: 8 }} />

      {/* Meta */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 11, color: C.textSub }}>🕐 {game.uhrzeit}</span>
        {game.platz && <span style={{ fontSize: 11, color: C.textSub }}>📍 {game.platz}</span>}
        <span style={{ fontSize: 11, color: C.textSub }}>{game.rasen}</span>
        {game.spielfeld_groesse && <span style={{ fontSize: 11, color: C.textSub }}>{game.spielfeld_groesse}</span>}
        {game.spieldauer && <span style={{ fontSize: 11, color: C.textSub }}>⏱ {game.spieldauer} min</span>}
      </div>

      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Stärke</span>
        <StrengthDots value={game.staerke} />
      </div>

      {game.wichtige_infos && (
        <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(255,159,10,0.1)", borderRadius: 6, fontSize: 11, color: "#FF9F0A" }}>
          ℹ️ {game.wichtige_infos}
        </div>
      )}
    </div>
  );
}

// ─── Gebuchte Spielkarte ───────────────────────────────────────────────────────

function GebuchteSpielKarte({ game, buchung, userLocation, onClick }) {
  const dist = userLocation && game.lat && game.lng ? haversine(userLocation.lat, userLocation.lng, game.lat, game.lng) : null;
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const kc = KAT_COLORS[kat] || { accent: "#FF453A", dim: "rgba(255,69,58,0.15)" };

  return (
    <div onClick={() => onClick(game)} style={{
      background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 14,
      padding: "12px 14px", marginBottom: 8, cursor: "pointer",
      borderLeft: "3px solid #FF453A",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 5 }}>
          <Pill color="#FF453A" dim="rgba(255,69,58,0.15)">GEBUCHT</Pill>
          {kat && <Pill color={kc.accent} dim={kc.dim}>{kat.toUpperCase()}</Pill>}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {dist !== null && <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{dist} km</span>}
          <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{formatDate(game.datum)}</span>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 1, letterSpacing: "-0.3px" }}>vs. {game.verein}</div>
      <div style={{ fontSize: 12, color: kc.accent, fontWeight: 700, marginBottom: 8 }}>{mannschaft}</div>
      <div style={{ height: 1, background: C.card2, marginBottom: 8 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: C.textSub }}>🕐 {game.uhrzeit}</span>
        {game.platz && <span style={{ fontSize: 11, color: C.textSub }}>📍 {game.platz}</span>}
        <span style={{ fontSize: 11, color: C.textSub }}>{game.rasen}</span>
      </div>
      {buchung && (
        <div style={{ background: C.card2, borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Kontakt Gegner</div>
          <div style={{ fontSize: 13, color: C.text, fontWeight: 700, marginBottom: 2 }}>{buchung.anbieter_name}</div>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 2 }}>{buchung.anbieter_verein}</div>
          <div style={{ fontSize: 12, color: "#0A84FF", fontWeight: 600 }}>{buchung.anbieter_tel}</div>
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
  const kc = KAT_COLORS[kat] || { accent: C.accent, dim: C.accentDim };

  return (
    <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 14, padding: "12px 14px", marginBottom: 8, borderLeft: "3px solid #FF9F0A" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 5 }}>
          <Pill color="#FF9F0A" dim="rgba(255,159,10,0.15)">SCHIRI GESUCHT</Pill>
          {kat && <Pill color={kc.accent} dim={kc.dim}>{kat.toUpperCase()}</Pill>}
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {dist !== null && <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{dist} km</span>}
          <span style={{ fontSize: 10, color: C.textDim, fontWeight: 600 }}>{formatDate(game.datum)}</span>
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 1, letterSpacing: "-0.3px" }}>{game.verein}</div>
      <div style={{ fontSize: 12, color: kc.accent, fontWeight: 700, marginBottom: 8 }}>{mannschaft}</div>
      <div style={{ height: 1, background: C.card2, marginBottom: 8 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: C.textSub }}>🕐 {game.uhrzeit}</span>
        {game.platz && <span style={{ fontSize: 11, color: C.textSub }}>📍 {game.platz}</span>}
        {game.spieldauer && <span style={{ fontSize: 11, color: C.textSub }}>⏱ {game.spieldauer} min</span>}
      </div>
      {game.schiri_status !== "besetzt" ? (
        <button onClick={() => onBewerben(game)} style={{ width: "100%", padding: 10, background: "rgba(255,159,10,0.15)", color: "#FF9F0A", border: "1px solid rgba(255,159,10,0.3)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Als Schiedsrichter bewerben
        </button>
      ) : (
        <div style={{ textAlign: "center", padding: 8, background: C.accentDim, borderRadius: 10, fontSize: 12, color: C.accent, fontWeight: 700 }}>✓ Schiedsrichter bestätigt</div>
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
    <div style={{ background: "rgba(10,132,255,0.12)", border: "0.5px solid rgba(10,132,255,0.3)", borderRadius: 12, padding: "11px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 28, height: 28, background: "#0A84FF", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>{ungelesen.length}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#0A84FF", marginBottom: 2 }}>
          {ungelesen.length === 1 ? "1 Spiel wurde angenommen!" : `${ungelesen.length} Spiele wurden angenommen!`}
        </div>
        <div style={{ fontSize: 11, color: C.textSub }}>{ungelesen.map((b) => `${b.bucher_verein} · ${b.datum}`).join(" | ")}</div>
      </div>
      <button onClick={allesGelesen} style={{ padding: "6px 12px", background: "#0A84FF", color: "white", border: "none", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 101, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 18, padding: "1.5rem", maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto", border: `0.5px solid ${C.border}` }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>Als Schiedsrichter bewerben</div>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 16 }}>{game.verein} · {formatDate(game.datum)} · {game.uhrzeit}</div>
        {[
          { label: "Dein Name", key: "name", type: "text", placeholder: "Vor- und Nachname" },
          { label: "Telefonnummer", key: "telefon", type: "tel", placeholder: "+49 ..." },
          { label: "Nachricht (optional)", key: "nachricht", type: "text", placeholder: "Erfahrung, Besonderheiten..." },
        ].map((f) => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <label style={lbl}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} style={inp} />
          </div>
        ))}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Lizenz</label>
          <select value={form.lizenz} onChange={(e) => setForm({ ...form, lizenz: e.target.value })} style={inp}>
            {SCHIRI_LIZENZEN.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: 13, background: C.accent, color: "#000", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Wird gesendet..." : "Bewerbung absenden"}
        </button>
        <button onClick={onClose} style={{ width: "100%", padding: 10, background: "transparent", border: "none", color: C.textSub, cursor: "pointer", fontSize: 13, marginTop: 6 }}>Abbrechen</button>
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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 102, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 18, padding: "1.5rem", maxWidth: 480, width: "100%", maxHeight: "85vh", overflowY: "auto", border: `0.5px solid ${C.border}`, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", border: `0.5px solid ${C.border}`, background: C.card2, cursor: "pointer", fontSize: 12, color: C.textSub }}>✕</button>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>Schiedsrichter-Bewerbungen</div>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 16 }}>{game.verein} · {formatDate(game.datum)}</div>
        {laden ? <Ladeindikator /> : anfragen.length === 0
          ? <div style={{ textAlign: "center", padding: "2rem", color: C.textDim }}>Noch keine Bewerbungen.</div>
          : anfragen.map((a) => (
            <div key={a.id} style={{ background: C.card2, borderRadius: 12, padding: "12px 14px", marginBottom: 10, borderLeft: `3px solid ${a.status === "bestaetigt" ? C.accent : a.status === "abgelehnt" ? "#FF453A" : C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{a.schiri_name}</div>
                {a.status === "bestaetigt" && <Pill color={C.accent} dim={C.accentDim}>✓ Bestätigt</Pill>}
                {a.status === "abgelehnt" && <Pill color="#FF453A" dim="rgba(255,69,58,0.15)">Abgelehnt</Pill>}
                {a.status === "offen" && <Pill color="#FF9F0A" dim="rgba(255,159,10,0.15)">Offen</Pill>}
              </div>
              <div style={{ fontSize: 12, color: "#0A84FF", marginBottom: 4 }}>{a.schiri_tel}</div>
              {a.schiri_lizenz && <div style={{ fontSize: 11, color: C.textSub, marginBottom: 4 }}>{a.schiri_lizenz}</div>}
              {a.nachricht && <div style={{ fontSize: 11, color: C.textSub, fontStyle: "italic", marginBottom: 8 }}>"{a.nachricht}"</div>}
              {a.status === "offen" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button onClick={() => ablehnen(a)} style={{ padding: 8, background: "rgba(255,69,58,0.12)", color: "#FF453A", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Ablehnen</button>
                  <button onClick={() => bestaetigen(a)} style={{ padding: 8, background: C.accent, color: "#000", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>✓ Bestätigen</button>
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
  const kc = KAT_COLORS[kat] || { accent: C.accent, dim: C.accentDim };
  const mapsUrl = game.adresse ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(game.adresse)}` : null;
  const istSchiri = session?.user?.user_metadata?.rolle === "schiedsrichter";

  const row = (icon, label, value, valueColor) => (
    <div key={label} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: `0.5px solid ${C.card2}` }}>
      <div style={{ fontSize: 14, width: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 13, color: valueColor || C.text, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 18, padding: "1.5rem", maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto", position: "relative", border: `0.5px solid ${C.border}`, borderTop: `3px solid ${kc.accent}` }}>
          <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", border: `0.5px solid ${C.border}`, background: C.card2, cursor: "pointer", fontSize: 12, color: C.textSub }}>✕</button>

          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
            <Pill color={game.type === "angebot" ? C.accent : "#FF9F0A"} dim={game.type === "angebot" ? C.accentDim : "rgba(255,159,10,0.15)"}>{game.type === "angebot" ? "ANGEBOT" : "ANFRAGE"}</Pill>
            {kat && <Pill color={kc.accent} dim={kc.dim}>{kat.toUpperCase()}</Pill>}
            {game.status === "gebucht" && <Pill color="#FF453A" dim="rgba(255,69,58,0.15)">GEBUCHT</Pill>}
            {dist !== null && <Pill color={C.textSub}>{dist} km</Pill>}
          </div>

          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 2, letterSpacing: "-0.4px" }}>{game.verein}</div>
          <div style={{ fontSize: 13, color: kc.accent, fontWeight: 700, marginBottom: 16 }}>{mannschaft}</div>

          <div style={{ background: C.card2, borderRadius: 12, overflow: "hidden", marginBottom: 12, padding: "0 14px" }}>
            {row("📅", "Datum & Uhrzeit", `${formatDate(game.datum)} · ${game.uhrzeit} Uhr`)}
            {row("📍", "Sportplatz", game.platz ? `${game.platz} — ${game.adresse}` : "Noch offen")}
            {row("🌿", "Rasenart", game.rasen)}
            {game.spielfeld_groesse && row("⬛", "Spielfeldgröße", game.spielfeld_groesse)}
            {game.spieldauer && row("⏱", "Spieldauer", `${game.spieldauer} Minuten`)}
            {row("👤", "Trainer", game.trainer_name)}
            {row("📞", "Telefon", game.telefon, "#0A84FF")}
          </div>

          <div style={{ background: C.card2, borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13 }}>💪</span>
            <div>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700, marginBottom: 5 }}>Spielstärke</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <StrengthDots value={game.staerke} />
                <span style={{ fontSize: 11, color: C.textSub }}>Stufe {game.staerke}/5</span>
              </div>
            </div>
          </div>

          {game.schiri_benoetigt && (
            <div style={{ background: "rgba(255,159,10,0.1)", border: "0.5px solid rgba(255,159,10,0.3)", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#FF9F0A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Schiedsrichter</div>
              <div style={{ fontSize: 13, color: "#FF9F0A" }}>
                {game.schiri_status === "besetzt" ? "✓ Schiedsrichter bestätigt" :
                  game.schiri_status === "angefragt" ? "Bewerbungen eingegangen" :
                    "Noch kein Schiedsrichter — jetzt bewerben"}
              </div>
            </div>
          )}

          {game.wichtige_infos && (
            <div style={{ background: "rgba(255,159,10,0.08)", border: "0.5px solid rgba(255,159,10,0.2)", borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: "#FF9F0A", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Wichtige Infos</div>
              <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>{game.wichtige_infos}</div>
            </div>
          )}

          {mapsUrl && (
            <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ display: "block", width: "100%", padding: 11, background: "rgba(10,132,255,0.15)", color: "#0A84FF", border: "0.5px solid rgba(10,132,255,0.3)", borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: "center", textDecoration: "none" }}>
              Navigation starten
            </a>
          )}

          {game.schiri_benoetigt && game.schiri_status === "angefragt" && !istSchiri && (
            <button onClick={() => setShowSchiriAnfragen(true)} style={{ width: "100%", padding: 11, background: "rgba(255,159,10,0.12)", color: "#FF9F0A", border: "0.5px solid rgba(255,159,10,0.3)", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: 8 }}>
              Bewerbungen ansehen
            </button>
          )}

          {game.status !== "gebucht" ? (
            <button onClick={() => { onClose(); onBook(game); }} style={{ width: "100%", padding: 13, background: C.accent, color: "#000", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              ⚡ Spiel annehmen
            </button>
          ) : (
            <div style={{ textAlign: "center", padding: "10px 0", fontSize: 13, color: C.textDim }}>Bereits vergeben</div>
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

function BookingModal({ game, session, onClose, onConfirm }) {
  const [form, setForm] = useState({ name: "", verein: "", tel: "", mannschaft: "E-Jugend (U10)", msg: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!form.name || !form.verein || !form.tel) { alert("Bitte Name, Verein und Telefonnummer ausfüllen."); return; }
    setLoading(true); await onConfirm(form); setLoading(false);
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 101, padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, borderRadius: 18, padding: "1.5rem", maxWidth: 440, width: "100%", maxHeight: "85vh", overflowY: "auto", border: `0.5px solid ${C.border}` }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 4 }}>Buchung abschließen</div>
        <div style={{ fontSize: 12, color: C.textSub, marginBottom: 16 }}>{game.verein} · {formatDate(game.datum)} · {game.uhrzeit}</div>
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
        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: 13, background: C.accent, color: "#000", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Wird gespeichert..." : "Buchung bestätigen"}
        </button>
        <button onClick={onClose} style={{ width: "100%", padding: 10, background: "transparent", border: "none", color: C.textSub, cursor: "pointer", fontSize: 13, marginTop: 6 }}>Abbrechen</button>
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
      <div style={{ display: "flex", gap: 5, marginBottom: 10, overflowX: "auto", paddingBottom: 2 }}>
        {FILTER_KAT.map((f) => {
          const aktiv = activeFilter === f;
          return (
            <button key={f} onClick={() => setActiveFilter(f)} style={{
              padding: "5px 12px", borderRadius: 20, border: "none",
              background: aktiv ? C.accent : C.card2,
              color: aktiv ? "#000" : C.textSub,
              fontSize: 11, fontWeight: aktiv ? 700 : 500,
              cursor: "pointer", whiteSpace: "nowrap",
            }}>{f}</button>
          );
        })}
      </div>
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
      {!laden && sortiert.length > 0 && (
        <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {sortiert.length} {sortiert.length === 1 ? "Eintrag" : "Einträge"}
        </div>
      )}
      {laden ? <Ladeindikator /> : sortiert.length === 0
        ? <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.textDim }}>Noch keine Einträge vorhanden.</div>
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

  const BtnToggle = ({ label, aktiv, onClick }) => (
    <button onClick={onClick} style={{
      flex: 1, padding: 11, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
      border: "none", background: aktiv ? C.accent : C.card2,
      color: aktiv ? "#000" : C.textSub,
    }}>{label}</button>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <BtnToggle label="⚽ Spiel anbieten" aktiv={type === "angebot"} onClick={() => setType("angebot")} />
        <BtnToggle label="🔍 Spiel anfragen" aktiv={type === "anfrage"} onClick={() => setType("anfrage")} />
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
              <button key={n} onClick={() => setStaerke(n)} style={{
                width: 38, height: 38, borderRadius: "50%", border: "none",
                background: staerke === n ? C.accent : C.card2,
                color: staerke === n ? "#000" : C.textSub,
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}>{n}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={sec}>
        <SectionLabel>Schiedsrichter</SectionLabel>
        <label style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }}>
          <div onClick={() => setSchiriBenoetigt(!schiriBenoetigt)} style={{ width: 44, height: 26, borderRadius: 13, background: schiriBenoetigt ? C.accent : C.card2, position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: schiriBenoetigt ? 20 : 2, transition: "left .2s" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Schiedsrichter wird benötigt</div>
            <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>Das Spiel erscheint in der Schiri-Börse</div>
          </div>
        </label>
      </div>

      <div style={sec}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <SectionLabel>Weitere Angaben</SectionLabel>
          <span style={{ fontSize: 9, background: C.card2, color: C.textDim, padding: "2px 7px", borderRadius: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Optional</span>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Spielfeldgröße</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {SPIELFELD_GROESSEN.map((g) => {
              const aktiv = form.spielfeld_groesse === g;
              return <button key={g} onClick={() => set("spielfeld_groesse", aktiv ? "" : g)} style={{
                padding: "6px 11px", borderRadius: 8, border: "none",
                background: aktiv ? C.accentDim : C.card2,
                color: aktiv ? C.accent : C.textSub,
                fontSize: 11, cursor: "pointer", fontWeight: aktiv ? 700 : 500,
              }}>{aktiv ? "✓ " : ""}{g}</button>;
            })}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Spieldauer (Minuten)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
            {[40, 50, 60, 70, 80, 90].map((min) => {
              const aktiv = parseInt(form.spieldauer) === min;
              return <button key={min} onClick={() => set("spieldauer", aktiv ? "" : min)} style={{
                padding: "6px 12px", borderRadius: 8, border: "none",
                background: aktiv ? C.accentDim : C.card2,
                color: aktiv ? C.accent : C.textSub,
                fontSize: 11, cursor: "pointer", fontWeight: aktiv ? 700 : 500,
              }}>{aktiv ? "✓ " : ""}{min} min</button>;
            })}
          </div>
          <input type="number" placeholder="Eigene Dauer..." min={10} max={180} value={form.spieldauer} onChange={(e) => set("spieldauer", e.target.value)} style={{ ...inp, fontSize: 13 }} />
        </div>
        <div>
          <label style={lbl}>Wichtige Infos</label>
          <textarea placeholder="z.B. Trikotfarbe, Parkplätze..." value={form.wichtige_infos} onChange={(e) => set("wichtige_infos", e.target.value)} rows={3} style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
        </div>
      </div>

      {type === "anfrage" && (
        <div style={sec}>
          <SectionLabel>Suchradius</SectionLabel>
          <label style={lbl}>Maximaler Umkreis: <strong style={{ color: C.accent }}>{umkreis} km</strong></label>
          <input type="range" min={5} max={150} step={5} value={umkreis} onChange={(e) => setUmkreis(parseInt(e.target.value))} style={{ width: "100%", marginBottom: 6, accentColor: C.accent }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.textDim }}>
            <span>5 km</span><span>{umkreis} km</span><span>150 km</span>
          </div>
        </div>
      )}

      <div style={sec}>
        <SectionLabel>{type === "angebot" ? "Ort" : "Dein Standort"}</SectionLabel>
        {type === "angebot" ? (
          <>
            <div style={{ marginBottom: 10 }}><label style={lbl}>Sportplatz</label><input type="text" style={inp} placeholder="z.B. Sportpark Nord" value={form.platz} onChange={(e) => set("platz", e.target.value)} /></div>
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

      <button onClick={handleSubmit} disabled={laden} style={{
        width: "100%", padding: 13, background: laden ? C.card2 : C.accent,
        color: laden ? C.textDim : "#000", border: "none", borderRadius: 12,
        fontSize: 15, fontWeight: 700, cursor: laden ? "not-allowed" : "pointer",
      }}>
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
      <div style={{ background: "rgba(255,159,10,0.1)", border: "0.5px solid rgba(255,159,10,0.25)", borderRadius: 12, padding: "11px 14px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#FF9F0A", marginBottom: 2 }}>Schiedsrichter-Börse</div>
        <div style={{ fontSize: 11, color: C.textSub }}>Alle Spiele die einen Schiedsrichter suchen.</div>
      </div>
      {toast && <div style={{ background: C.accent, color: "#000", padding: "10px 16px", borderRadius: 10, marginBottom: 12, fontSize: 13, fontWeight: 700 }}>✓ {toast}</div>}
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
      {offeneSpiele.length === 0
        ? <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.textDim }}>Keine Spiele mit Schiedsrichter-Bedarf.</div>
        : offeneSpiele.map((g) => <SchiriBörsenKarte key={g.id} game={g} userLocation={userLocation} onBewerben={setBewerbungGame} />)
      }
      {bewerbungGame && <SchiriBewerbungModal game={bewerbungGame} onClose={() => setBewerbungGame(null)} onConfirm={() => { setBewerbungGame(null); showToast("Bewerbung gesendet!"); onRefresh(); }} />}
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

  const katKeys = Object.keys(MANNSCHAFTEN);

  return (
    <div>
      {!userLocation && <div style={{ background: "rgba(255,159,10,0.1)", border: "0.5px solid rgba(255,159,10,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#FF9F0A", fontWeight: 600 }}>Kein Standort gesetzt — bitte oben rechts eingeben.</div>}

      <div style={sec}>
        <SectionLabel>Mannschaft</SectionLabel>
        <div style={{ display: "flex", gap: 4, marginBottom: 10, background: C.card2, borderRadius: 10, padding: 3 }}>
          {["Alle", ...katKeys].map((kat) => {
            const kc = KAT_COLORS[kat] || {};
            const aktiv = aktiveKat === kat;
            const hat = kat !== "Alle" && ausgewaehlt.some((m) => getKategorie(m) === kat);
            return <button key={kat} onClick={() => { setAktiveKat(kat); if (kat === "Alle") setAusgewaehlt([]); }} style={{
              flex: 1, padding: "6px 3px", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 10, fontWeight: 700,
              background: aktiv ? (kat === "Alle" ? C.accent : kc.dim) : "transparent",
              color: aktiv ? (kat === "Alle" ? "#000" : kc.accent) : C.textDim,
            }}>
              {kat}{hat && <span style={{ display: "inline-block", width: 4, height: 4, background: kc.accent, borderRadius: "50%", marginLeft: 2, verticalAlign: "middle" }} />}
            </button>;
          })}
        </div>
        {aktiveKat !== "Alle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {MANNSCHAFTEN[aktiveKat].map((m) => {
              const aktiv = ausgewaehlt.includes(m);
              const kc = KAT_COLORS[aktiveKat] || {};
              return <button key={m} onClick={() => toggleM(m)} style={{
                padding: "9px 14px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 12,
                fontWeight: aktiv ? 700 : 500, textAlign: "left",
                background: aktiv ? kc.dim : C.card2,
                color: aktiv ? kc.accent : C.textSub,
                borderLeft: aktiv ? `3px solid ${kc.accent}` : "3px solid transparent",
              }}>{aktiv ? "✓ " : ""}{m}</button>;
            })}
            {ausgewaehlt.length > 0 && <button onClick={() => setAusgewaehlt([])} style={{ padding: "6px 14px", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 11, background: "transparent", color: C.textDim }}>Auswahl zurücksetzen</button>}
          </div>
        )}
      </div>

      <div style={sec}>
        <SectionLabel>Filter</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Typ</label><select style={inp} value={typ} onChange={(e) => setTyp(e.target.value)}><option value="">Alle</option><option value="angebot">Angebot</option><option value="anfrage">Anfrage</option></select></div>
          <div><label style={lbl}>Spielstärke</label><select style={inp} value={staerke} onChange={(e) => setStaerke(e.target.value)}><option value="">Egal</option>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}</select></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><label style={lbl}>Datum ab</label><input type="date" style={inp} value={datum} onChange={(e) => setDatum(e.target.value)} /></div>
          <div><label style={lbl}>Rasen</label><select style={inp} value={rasen} onChange={(e) => setRasen(e.target.value)}><option value="">Egal</option>{["Naturrasen","Kunstrasen","Hartplatz","Halle"].map((r) => <option key={r}>{r}</option>)}</select></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Umkreis: <strong style={{ color: C.accent }}>{km} km</strong>{userLocation ? ` ab ${userLocation.label}` : ""}</label>
          <input type="range" min={5} max={150} step={5} value={km} onChange={(e) => setKm(parseInt(e.target.value))} style={{ width: "100%", accentColor: C.accent }} />
        </div>
        <div style={{ marginBottom: 12 }}><label style={lbl}>Sortierung</label><SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={reset} style={{ padding: 11, background: C.card2, color: C.textSub, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Zurücksetzen</button>
          <button onClick={search} style={{ padding: 11, background: C.accent, color: "#000", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Suchen</button>
        </div>
      </div>

      {results !== null && (
        <>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{results.length} {results.length === 1 ? "Ergebnis" : "Ergebnisse"}</div>
          {results.length === 0 ? <div style={{ textAlign: "center", padding: "2rem", color: C.textDim }}>Keine Spiele gefunden</div>
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
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.textDim }}>
      Noch keine gebuchten Spiele.<br />Finde ein Spiel im Tab „Spiele"!
    </div>
  );

  return (
    <div>
      <div style={{ background: "rgba(255,69,58,0.1)", border: "0.5px solid rgba(255,69,58,0.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, fontSize: 12, color: "#FF453A", fontWeight: 600 }}>
        {sortiert.length} gebuchte {sortiert.length === 1 ? "Spiel" : "Spiele"} — Kontaktdaten direkt sichtbar.
      </div>
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
      {sortiert.map((g) => {
        const buchung = meineBuchungen.find((b) => b.game_id === g.id);
        return <GebuchteSpielKarte key={g.id} game={g} buchung={buchung} userLocation={userLocation} onClick={onSelectGame} />;
      })}
    </div>
  );
}

// ─── Haupt-App ─────────────────────────────────────────────────────────────────

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

  const rolle = session?.user?.user_metadata?.rolle || "trainer";
  const istSchiri = rolle === "schiedsrichter";

  const TABS = istSchiri
    ? [{ id: "liste", label: "Spiele" }, { id: "boerse", label: "Börse" }, { id: "suche", label: "Suchen" }]
    : [{ id: "liste", label: "Spiele" }, { id: "neu", label: "+ Neu" }, { id: "suche", label: "Suchen" }, { id: "boerse", label: "Schiri" }, { id: "meine", label: "Meine" }];

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
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1rem", fontFamily: "system-ui, -apple-system, sans-serif", color: C.text, background: C.bg, minHeight: "100vh" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, background: istSchiri ? "#FF9F0A" : C.accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
          ⚽
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: "-0.4px" }}>KickMatch</div>
          <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{istSchiri ? "Schiedsrichter" : "Freundschaftsspiele"}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setShowStandortModal(true)} style={{
            padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer",
            border: "none", borderRadius: 8,
            background: userLocation ? C.accentDim : C.card2,
            color: userLocation ? C.accent : C.textSub,
          }}>
            📍 {userLocation ? userLocation.label : "Standort"}
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ padding: "5px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer", border: "none", borderRadius: 8, background: C.card2, color: C.textSub }}>
            Abmelden
          </button>
        </div>
      </div>

      {/* Benachrichtigung */}
      {!istSchiri && session && <BenachrichtigungenBanner session={session} onNavigateMeine={() => setActiveTab("meine")} />}

      <Toast message={toast} />

      {/* Tab-Bar */}
      <div style={{ display: "flex", gap: 3, marginBottom: 16, background: C.card, borderRadius: 12, padding: 4 }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: "8px 6px", border: "none", borderRadius: 9, cursor: "pointer",
            fontSize: 11, fontWeight: activeTab === tab.id ? 700 : 500,
            background: activeTab === tab.id ? C.accent : "transparent",
            color: activeTab === tab.id ? "#000" : C.textDim,
            transition: "all .15s",
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "liste" && <ListeTab games={games} userLocation={userLocation} laden={laden} onSelectGame={setSelectedGame} />}
      {activeTab === "neu" && !istSchiri && <EintragenTab onSubmit={handleAddGame} />}
      {activeTab === "suche" && <SucheTab games={games} userLocation={userLocation} onSelectGame={setSelectedGame} />}
      {activeTab === "boerse" && <SchiriBörseTab games={games} userLocation={userLocation} session={session} onRefresh={ladeSpiele} />}
      {activeTab === "meine" && !istSchiri && <MeineTab userLocation={userLocation} onSelectGame={setSelectedGame} session={session} />}

      {selectedGame && currentGame && (
        <DetailModal game={currentGame} userLocation={userLocation} session={session} onClose={() => setSelectedGame(null)} onBook={(g) => { setSelectedGame(null); setBookingGame(g); }} onRefresh={ladeSpiele} />
      )}
      {bookingGame && <BookingModal game={bookingGame} session={session} onClose={() => setBookingGame(null)} onConfirm={handleConfirmBooking} />}
      {showStandortModal && <StandortModal onClose={() => setShowStandortModal(false)} onSave={(loc) => { setUserLocation(loc); setShowStandortModal(false); showToast(`Standort: ${loc.label}`); }} />}
    </div>
  );
}
