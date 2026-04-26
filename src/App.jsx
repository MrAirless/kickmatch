import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Login from "./Login";

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
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

const STUTTGART_LAT = 48.7758;
const STUTTGART_LNG = 9.1829;

// ─── Kleine Hilfskomponenten ───────────────────────────────────────────────────

function StrengthDots({ value }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: i <= value ? "#1D9E75" : "#ddd",
          }}
        />
      ))}
    </div>
  );
}

function Badge({ children, color }) {
  const styles = {
    offer:  { background: "#E1F5EE", color: "#085041" },
    search: { background: "#EEEDFE", color: "#3C3489" },
    blue:   { background: "#E6F1FB", color: "#0C447C" },
    green:  { background: "#EAF3DE", color: "#27500A" },
    gray:   { background: "#F1EFE8", color: "#444441" },
  };
  const s = styles[color] || styles.gray;
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px",
      borderRadius: 20, fontSize: 11, fontWeight: 500, ...s,
    }}>
      {children}
    </span>
  );
}

function Toast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      background: "#1D9E75", color: "white",
      padding: "12px 20px", borderRadius: 12,
      fontSize: 14, fontWeight: 500, marginBottom: 12,
    }}>
      {message}
    </div>
  );
}

// ─── Spielkarte ────────────────────────────────────────────────────────────────

function GameCard({ game, onClick }) {
  const dist = game.lat && game.lng
    ? haversine(STUTTGART_LAT, STUTTGART_LNG, game.lat, game.lng)
    : null;
  return (
    <div
      onClick={() => onClick(game)}
      style={{
        background: "white", border: "0.5px solid #e5e5e5",
        borderRadius: 12, padding: "1rem 1.25rem",
        marginBottom: 10, cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Badge color={game.type === "angebot" ? "offer" : "search"}>
            {game.type === "angebot" ? "Angebot" : "Anfrage"}
          </Badge>
          <Badge color="blue">{game.jugend.split(" ")[0]}</Badge>
          {game.status === "gebucht" && <Badge color="green">Gebucht</Badge>}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {dist !== null && <Badge color="gray">{dist} km</Badge>}
          <span style={{ fontSize: 12, color: "#888" }}>{formatDate(game.datum)}</span>
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 500, color: "#1a1a1a" }}>{game.verein}</div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 12, color: "#888" }}>🕐 {game.uhrzeit}</span>
        {game.platz && <span style={{ fontSize: 12, color: "#888" }}>· {game.platz}</span>}
        <span style={{ fontSize: 12, color: "#888" }}>· {game.rasen}</span>
      </div>

      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 11, color: "#888" }}>Spielstärke:</span>
        <StrengthDots value={game.staerke} />
      </div>
    </div>
  );
}

// ─── Detailansicht (Modal) ─────────────────────────────────────────────────────

function DetailModal({ game, bookings, onClose, onBook }) {
  if (!game) return null;
  const dist = game.lat && game.lng
    ? haversine(STUTTGART_LAT, STUTTGART_LNG, game.lat, game.lng)
    : null;
  const booking = bookings.find((b) => b.gameId === game.id);
  const mapsUrl = game.adresse
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(game.adresse)}`
    : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 16,
          padding: "1.5rem", maxWidth: 440, width: "100%",
          maxHeight: "85vh", overflowY: "auto", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12,
            width: 28, height: 28, borderRadius: "50%",
            border: "0.5px solid #e5e5e5", background: "#f5f5f5",
            cursor: "pointer", fontSize: 13, color: "#666",
          }}
        >✕</button>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          <Badge color={game.type === "angebot" ? "offer" : "search"}>
            {game.type === "angebot" ? "Spiel anbieten" : "Spiel anfragen"}
          </Badge>
          <Badge color="blue">{game.jugend}</Badge>
          {game.status === "gebucht" && <Badge color="green">✓ Gebucht</Badge>}
          {dist !== null && <Badge color="gray">{dist} km entfernt</Badge>}
        </div>

        <div style={{ fontSize: 18, fontWeight: 500, marginBottom: 14 }}>{game.verein}</div>

        {[
          { icon: "📅", label: "Datum & Uhrzeit", value: `${formatDate(game.datum)} um ${game.uhrzeit} Uhr` },
          { icon: "📍", label: "Sportplatz", value: game.platz ? `${game.platz} — ${game.adresse}` : "Noch offen" },
          { icon: "🌿", label: "Rasenart", value: game.rasen },
          { icon: "👤", label: "Trainer", value: game.trainer_name },
          { icon: "📞", label: "Telefon", value: game.telefon },
        ].map((row) => (
          <div key={row.label} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: "0.5px solid #f0f0f0" }}>
            <div style={{ fontSize: 15, width: 20, flexShrink: 0 }}>{row.icon}</div>
            <div>
              <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>{row.label}</div>
              <div style={{ fontSize: 14, color: row.label === "Telefon" ? "#185FA5" : "#1a1a1a" }}>{row.value}</div>
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "9px 0", borderBottom: "0.5px solid #f0f0f0" }}>
          <div style={{ fontSize: 15, width: 20 }}>💪</div>
          <div>
            <div style={{ fontSize: 11, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>Spielstärke</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <StrengthDots value={game.staerke} />
              <span style={{ fontSize: 12, color: "#888" }}>Stufe {game.staerke}/5</span>
            </div>
          </div>
        </div>

        {booking && (
          <div style={{ background: "#EAF3DE", borderRadius: 8, padding: 12, marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#085041", marginBottom: 6 }}>✓ Gebucht von</div>
            <div style={{ fontSize: 14, color: "#27500A" }}>{booking.trainerName} · {booking.verein}</div>
            <div style={{ fontSize: 13, color: "#3B6D11" }}>{booking.tel}</div>
          </div>
        )}

        {mapsUrl && game.status !== "gebucht" && (
          <a href={mapsUrl} target="_blank" rel="noreferrer"
            style={{
              display: "block", width: "100%", padding: 11,
              background: "#378ADD", color: "white", border: "none",
              borderRadius: 8, fontSize: 14, fontWeight: 500,
              cursor: "pointer", marginTop: 12, textAlign: "center",
              textDecoration: "none",
            }}>
            Navigation starten (Google Maps)
          </a>
        )}

        {game.status !== "gebucht" ? (
          <button
            onClick={() => { onClose(); onBook(game); }}
            style={{
              width: "100%", padding: 12, background: "#1D9E75",
              color: "white", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 500, cursor: "pointer", marginTop: 8,
            }}>
            ⚡ Spiel jetzt annehmen
          </button>
        ) : (
          <div style={{ textAlign: "center", padding: "10px 0", marginTop: 8, fontSize: 14, color: "#aaa" }}>
            Bereits vergeben
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Buchungs-Modal ────────────────────────────────────────────────────────────

function BookingModal({ game, onClose, onConfirm }) {
  const [form, setForm] = useState({ name: "", verein: "", tel: "", jugend: "E-Jugend (U10)", msg: "" });

  function handleSubmit() {
    if (!form.name || !form.verein || !form.tel) {
      alert("Bitte Name, Verein und Telefonnummer ausfüllen.");
      return;
    }
    onConfirm(form);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 101, padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 16,
          padding: "1.5rem", maxWidth: 440, width: "100%",
          maxHeight: "85vh", overflowY: "auto", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 12, right: 12,
            width: 28, height: 28, borderRadius: "50%",
            border: "0.5px solid #e5e5e5", background: "#f5f5f5",
            cursor: "pointer", fontSize: 13, color: "#666",
          }}
        >✕</button>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 4 }}>Buchung abschließen</div>
          <div style={{ fontSize: 13, color: "#888" }}>
            {game.verein} · {formatDate(game.datum)} · {game.uhrzeit} Uhr
          </div>
        </div>

        <div style={{ background: "#f5f5f5", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#666" }}>
          Bitte gib deine Kontaktdaten ein, damit {game.trainer_name} dich erreichen kann.
        </div>

        {[
          { label: "Dein Name", key: "name", type: "text", placeholder: "Vor- und Nachname" },
          { label: "Dein Verein", key: "verein", type: "text", placeholder: "z.B. FC Musterstadt" },
          { label: "Deine Telefonnummer", key: "tel", type: "tel", placeholder: "+49 ..." },
          { label: "Nachricht (optional)", key: "msg", type: "text", placeholder: "z.B. Können wir 10:30 Uhr machen?" },
        ].map((f) => (
          <div key={f.key} style={{ marginBottom: 10 }}>
            <label style={{ display: "block", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 5 }}>{f.label}</label>
            <input
              type={f.type}
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              style={{
                width: "100%", padding: "8px 10px",
                border: "0.5px solid #ccc", borderRadius: 8,
                fontSize: 14, outline: "none",
              }}
            />
          </div>
        ))}

        <div style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 5 }}>Jahrgang deiner Mannschaft</label>
          <select
            value={form.jugend}
            onChange={(e) => setForm({ ...form, jugend: e.target.value })}
            style={{ width: "100%", padding: "8px 10px", border: "0.5px solid #ccc", borderRadius: 8, fontSize: 14 }}
          >
            {["E-Jugend (U10)", "D-Jugend (U12)", "C-Jugend (U14)", "B-Jugend (U17)", "A-Jugend (U19)"].map((j) => (
              <option key={j}>{j}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSubmit}
          style={{
            width: "100%", padding: 12, background: "#1D9E75",
            color: "white", border: "none", borderRadius: 8,
            fontSize: 15, fontWeight: 500, cursor: "pointer", marginTop: 6,
          }}
        >
          Buchung bestätigen
        </button>
        <button
          onClick={onClose}
          style={{
            width: "100%", padding: 10, background: "transparent",
            border: "none", color: "#888", cursor: "pointer", fontSize: 13, marginTop: 8,
          }}
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}

// ─── Tab: Spielliste ───────────────────────────────────────────────────────────

const FILTERS = ["Alle", "Angebote", "Anfragen", "E-Jugend", "D-Jugend", "C-Jugend"];

function ListeTab({ games, bookings, onSelectGame }) {
  const [activeFilter, setActiveFilter] = useState("Alle");

  const filtered = games.filter((g) => {
    if (activeFilter === "Alle") return true;
    if (activeFilter === "Angebote") return g.type === "angebot";
    if (activeFilter === "Anfragen") return g.type === "anfrage";
    return g.jugend.includes(activeFilter);
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: "6px 13px", borderRadius: 20, border: "0.5px solid",
              borderColor: activeFilter === f ? "#185FA5" : "#ccc",
              background: activeFilter === f ? "#185FA5" : "white",
              color: activeFilter === f ? "white" : "#666",
              fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {f}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa" }}>
          Noch keine Einträge vorhanden.
        </div>
      ) : (
        filtered.map((g) => <GameCard key={g.id} game={g} onClick={onSelectGame} />)
      )}
    </div>
  );
}

// ─── Tab: Eintragen ────────────────────────────────────────────────────────────

function EintragenTab({ onSubmit }) {
  const [type, setType] = useState("angebot");
  const [staerke, setStaerke] = useState(3);
  const [form, setForm] = useState({
    datum: "", uhrzeit: "10:00", jugend: "E-Jugend (U10)", rasen: "Naturrasen",
    platz: "", adresse: "", trainer_name: "", telefon: "", verein: "",
  });

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })); }

  function handleSubmit() {
    if (!form.datum || !form.trainer_name || !form.verein) {
      alert("Bitte Datum, Name und Verein ausfüllen.");
      return;
    }
    onSubmit({ ...form, type, staerke });
    setForm({ datum: "", uhrzeit: "10:00", jugend: "E-Jugend (U10)", rasen: "Naturrasen", platz: "", adresse: "", trainer_name: "", telefon: "", verein: "" });
    setType("angebot");
    setStaerke(3);
  }

  const inputStyle = {
    width: "100%", padding: "8px 10px",
    border: "0.5px solid #ccc", borderRadius: 8, fontSize: 14,
  };
  const labelStyle = { display: "block", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 5 };
  const sectionStyle = {
    background: "white", border: "0.5px solid #e5e5e5",
    borderRadius: 12, padding: "1.25rem", marginBottom: 10,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {[
          { val: "angebot", label: "⚽ Spiel anbieten", active: "#E1F5EE", activeTxt: "#085041", activeBorder: "#1D9E75" },
          { val: "anfrage", label: "🔍 Spiel anfragen", active: "#EEEDFE", activeTxt: "#3C3489", activeBorder: "#534AB7" },
        ].map((btn) => (
          <button
            key={btn.val}
            onClick={() => setType(btn.val)}
            style={{
              flex: 1, padding: 10, borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer",
              border: `0.5px solid ${type === btn.val ? btn.activeBorder : "#ccc"}`,
              background: type === btn.val ? btn.active : "transparent",
              color: type === btn.val ? btn.activeTxt : "#888",
            }}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Spieldaten</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Datum</label>
            <input type="date" style={inputStyle} value={form.datum} onChange={(e) => set("datum", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Uhrzeit</label>
            <input type="time" style={inputStyle} value={form.uhrzeit} onChange={(e) => set("uhrzeit", e.target.value)} />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Jahrgang</label>
            <select style={inputStyle} value={form.jugend} onChange={(e) => set("jugend", e.target.value)}>
              {["E-Jugend (U10)", "D-Jugend (U12)", "C-Jugend (U14)", "B-Jugend (U17)", "A-Jugend (U19)"].map((j) => <option key={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Rasenart</label>
            <select style={inputStyle} value={form.rasen} onChange={(e) => set("rasen", e.target.value)}>
              {["Naturrasen", "Kunstrasen", "Hartplatz", "Halle"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={labelStyle}>Spielstärke (1 = schwächer, 5 = stärker)</label>
          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setStaerke(n)}
                style={{
                  width: 36, height: 36, borderRadius: "50%", border: "0.5px solid",
                  borderColor: staerke === n ? "#1D9E75" : "#ccc",
                  background: staerke === n ? "#1D9E75" : "white",
                  color: staerke === n ? "white" : "#888",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Ort</div>
        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Sportplatz Name</label>
          <input type="text" style={inputStyle} placeholder="z.B. Sportpark Nord" value={form.platz} onChange={(e) => set("platz", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Adresse (Straße, PLZ Ort)</label>
          <input type="text" style={inputStyle} placeholder="Musterstr. 1, 70563 Stuttgart" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} />
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Trainer & Verein</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input type="text" style={inputStyle} placeholder="Vor- Nachname" value={form.trainer_name} onChange={(e) => set("trainer_name", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Telefon</label>
            <input type="tel" style={inputStyle} placeholder="+49 ..." value={form.telefon} onChange={(e) => set("telefon", e.target.value)} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Verein</label>
          <input type="text" style={inputStyle} placeholder="z.B. FC Musterstadt" value={form.verein} onChange={(e) => set("verein", e.target.value)} />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        style={{
          width: "100%", padding: 12, background: "#1D9E75",
          color: "white", border: "none", borderRadius: 8,
          fontSize: 15, fontWeight: 500, cursor: "pointer",
        }}
      >
        Veröffentlichen
      </button>
    </div>
  );
}

// ─── Tab: Suche ────────────────────────────────────────────────────────────────

function SucheTab({ games, onSelectGame }) {
  const [results, setResults] = useState(null);
  const [km, setKm] = useState(30);
  const [filter, setFilter] = useState({ jugend: "", typ: "", datum: "", staerke: "", rasen: "" });

  function set(key, val) { setFilter((f) => ({ ...f, [key]: val })); }

  function search() {
    const res = games
      .filter((g) => {
        if (filter.jugend && !g.jugend.includes(filter.jugend.split(" ")[0])) return false;
        if (filter.typ && g.type !== filter.typ) return false;
        if (filter.datum && g.datum < filter.datum) return false;
        if (filter.staerke && g.staerke !== parseInt(filter.staerke)) return false;
        if (filter.rasen && g.rasen !== filter.rasen) return false;
        if (g.lat && g.lng && haversine(STUTTGART_LAT, STUTTGART_LNG, g.lat, g.lng) > km) return false;
        return true;
      })
      .sort((a, b) => {
        const da = a.lat && a.lng ? haversine(STUTTGART_LAT, STUTTGART_LNG, a.lat, a.lng) : 999;
        const db = b.lat && b.lng ? haversine(STUTTGART_LAT, STUTTGART_LNG, b.lat, b.lng) : 999;
        return da - db;
      });
    setResults(res);
  }

  const selectStyle = {
    width: "100%", padding: "8px 10px",
    border: "0.5px solid #ccc", borderRadius: 8, fontSize: 14,
  };
  const labelStyle = { display: "block", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 5 };

  return (
    <div>
      <div style={{ background: "white", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "1.25rem", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Spiel finden</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Jahrgang</label>
            <select style={selectStyle} value={filter.jugend} onChange={(e) => set("jugend", e.target.value)}>
              <option value="">Alle</option>
              {["E-Jugend (U10)", "D-Jugend (U12)", "C-Jugend (U14)", "B-Jugend (U17)", "A-Jugend (U19)"].map((j) => <option key={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Typ</label>
            <select style={selectStyle} value={filter.typ} onChange={(e) => set("typ", e.target.value)}>
              <option value="">Alle</option>
              <option value="angebot">Angebot</option>
              <option value="anfrage">Anfrage</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <label style={labelStyle}>Datum ab</label>
            <input type="date" style={selectStyle} value={filter.datum} onChange={(e) => set("datum", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Spielstärke</label>
            <select style={selectStyle} value={filter.staerke} onChange={(e) => set("staerke", e.target.value)}>
              <option value="">Egal</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <label style={labelStyle}>Rasen</label>
          <select style={selectStyle} value={filter.rasen} onChange={(e) => set("rasen", e.target.value)}>
            <option value="">Egal</option>
            {["Naturrasen", "Kunstrasen", "Hartplatz", "Halle"].map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Umkreis: {km} km (Standort: Stuttgart)</label>
          <input
            type="range" min={5} max={100} step={5} value={km}
            onChange={(e) => setKm(parseInt(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>

        <button
          onClick={search}
          style={{
            width: "100%", padding: 12, background: "#185FA5",
            color: "white", border: "none", borderRadius: 8,
            fontSize: 15, fontWeight: 500, cursor: "pointer",
          }}
        >
          Suchen
        </button>
      </div>

      {results !== null && (
        results.length === 0
          ? <div style={{ textAlign: "center", padding: "2rem", color: "#aaa" }}>Keine Spiele gefunden</div>
          : results.map((g) => <GameCard key={g.id} game={g} onClick={onSelectGame} />)
      )}
    </div>
  );
}

// ─── Tab: Meine Spiele ─────────────────────────────────────────────────────────

function MeineTab({ games, bookings, onSelectGame }) {
  const myGames = bookings.map((b) => games.find((g) => g.id === b.gameId)).filter(Boolean);

  if (myGames.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#aaa" }}>
        Noch keine gebuchten Spiele.<br />Finde ein Spiel im Tab „Spiele"!
      </div>
    );
  }
  return (
    <div>
      {myGames.map((g) => <GameCard key={g.id} game={g} onClick={onSelectGame} />)}
    </div>
  );
}

// ─── Haupt-App ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: "liste",   label: "Spiele" },
  { id: "neu",     label: "+ Eintragen" },
  { id: "suche",   label: "Suchen" },
  { id: "meine",   label: "Meine" },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState("liste");
  const [games, setGames] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [bookingGame, setBookingGame] = useState(null);
  const [toast, setToast] = useState("");

  // ── Login-Logik ──────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Kein Nutzer eingeloggt → Login-Seite anzeigen
  if (!session) {
    return <Login />;
  }

  // ── App-Logik ────────────────────────────────────────────────────────────────
  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function handleAddGame(formData) {
    const newGame = {
      ...formData,
      id: Date.now(),
      status: "offen",
      lat: null,
      lng: null,
    };
    setGames((prev) => [newGame, ...prev]);
    showToast("✓ Erfolgreich veröffentlicht!");
    setActiveTab("liste");
  }

  function handleConfirmBooking(bookingData) {
    setGames((prev) =>
      prev.map((g) => g.id === bookingGame.id ? { ...g, status: "gebucht" } : g)
    );
    setBookings((prev) => [...prev, { gameId: bookingGame.id, ...bookingData }]);
    setBookingGame(null);
    showToast("✓ Spiel gebucht!");
    setActiveTab("meine");
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "1rem", fontFamily: "system-ui, sans-serif", color: "#1a1a1a" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem" }}>
        <div style={{ width: 32, height: 32, background: "#1D9E75", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚽</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>KickMatch</div>
          <div style={{ fontSize: 12, color: "#888" }}>Freundschaftsspiele koordinieren</div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#aaa" }}>{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              padding: "5px 12px", fontSize: 12, cursor: "pointer",
              border: "0.5px solid #e5e5e5", borderRadius: 8,
              background: "white", color: "#666",
            }}
          >
            Abmelden
          </button>
        </div>
      </div>

      <Toast message={toast} />

      {/* Tab-Bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1.25rem", background: "#f5f5f5", borderRadius: 12, padding: 4 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, padding: "8px 10px", border: "none", borderRadius: 8,
              cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "all .15s",
              background: activeTab === tab.id ? "white" : "transparent",
              color: activeTab === tab.id ? "#1a1a1a" : "#888",
              boxShadow: activeTab === tab.id ? "0 0 0 0.5px #e0e0e0" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "liste" && (
        <ListeTab games={games} bookings={bookings} onSelectGame={setSelectedGame} />
      )}
      {activeTab === "neu" && (
        <EintragenTab onSubmit={handleAddGame} />
      )}
      {activeTab === "suche" && (
        <SucheTab games={games} onSelectGame={setSelectedGame} />
      )}
      {activeTab === "meine" && (
        <MeineTab games={games} bookings={bookings} onSelectGame={setSelectedGame} />
      )}

      {selectedGame && (
        <DetailModal
          game={games.find((g) => g.id === selectedGame.id)}
          bookings={bookings}
          onClose={() => setSelectedGame(null)}
          onBook={(g) => { setSelectedGame(null); setBookingGame(g); }}
        />
      )}
      {bookingGame && (
        <BookingModal
          game={bookingGame}
          onClose={() => setBookingGame(null)}
          onConfirm={handleConfirmBooking}
        />
      )}
    </div>
  );
}
