import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  MANNSCHAFTEN, SPIELFELD_GROESSEN, SCHIRI_LIZENZEN,
  formatDate, haversine, getKategorie, kategorieColor,
  InlineBadge, StrengthDots, MannschaftAuswahl,
  BookingModal, SpieleEditModal,
} from "../lib/gameShared";

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

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-medium mb-4 shadow-md">
      ✓ {message}
    </div>
  );
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
    <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
      <span className="text-xs font-semibold text-gray-400 whitespace-nowrap self-center">Sortieren:</span>
      {optionen.map((o) => (
        <button key={o.val} onClick={() => onChange(o.val)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
            sortBy === o.val ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-500 bg-white hover:border-brand-300"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

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
    <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl">
        <h3 className="text-base font-bold mb-1">Mein Standort</h3>
        <p className="text-sm text-gray-500 mb-5">Für Umkreissuche und Entfernungsanzeige</p>
        <button onClick={useGPS} disabled={loading} className="btn-primary w-full justify-center mb-3">
          {loading ? "Wird ermittelt…" : "📍 GPS-Standort verwenden"}
        </button>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-gray-200" /><span className="text-xs text-gray-400">oder</span><div className="flex-1 h-px bg-gray-200" />
        </div>
        <input
          type="text"
          placeholder="z.B. Mannheim oder 68159"
          value={stadtInput}
          onChange={(e) => setStadtInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && useStadt()}
          className="input mb-3"
        />
        <button onClick={useStadt} disabled={loading} className="btn-primary w-full justify-center">Standort bestätigen</button>
        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>
    </div>
  );
}

function GameCard({ game, userLocation, onClick }) {
  const dist = userLocation && game.lat && game.lng ? haversine(userLocation.lat, userLocation.lng, game.lat, game.lng) : null;
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const c = kategorieColor(kat);
  const isOffer = game.type === "angebot";

  return (
    <div
      onClick={() => onClick(game)}
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:border-brand-300 hover:shadow-md transition-all cursor-pointer overflow-hidden mb-3"
      style={{ borderLeft: `4px solid ${isOffer ? "#1D9E75" : "#534AB7"}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex gap-1.5 flex-wrap">
            <InlineBadge bg={isOffer ? "#E1F5EE" : "#EEEDFE"} color={isOffer ? "#085041" : "#3C3489"} border={isOffer ? "#A8DFC4" : "#C5C2F8"}>
              {isOffer ? "⚽ Angebot" : "🔍 Anfrage"}
            </InlineBadge>
            {kat && <InlineBadge bg={c.bg} color={c.text} border={c.border}>{kat}</InlineBadge>}
            {game.status === "gebucht" && <InlineBadge bg="#FCEBEB" color="#791F1F" border="#F09595">Gebucht</InlineBadge>}
            {game.schiri_benoetigt && (
              <InlineBadge bg="#FFFBE6" color="#7A5C00" border="#F5D87A">
                🟡 {game.schiri_status === "besetzt" ? "Schiri ✓" : "Schiri gesucht"}
              </InlineBadge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {dist !== null && <span className="text-xs text-gray-400">{dist} km</span>}
            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">{formatDate(game.datum)}</span>
          </div>
        </div>
        <p className="font-semibold text-gray-900 text-base mb-0.5">{game.verein}</p>
        <p className="text-sm text-gray-500 mb-3">{mannschaft}</p>
        <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-3">
          <span className="text-xs text-gray-500">🕐 {game.uhrzeit} Uhr</span>
          {game.platz && <span className="text-xs text-gray-500">📍 {game.platz}</span>}
          <span className="text-xs text-gray-500">🌿 {game.rasen}</span>
          {game.spielfeld_groesse && <span className="text-xs text-gray-500">⬛ {game.spielfeld_groesse}</span>}
          {game.spieldauer && <span className="text-xs text-gray-500">⏱️ {game.spieldauer} min</span>}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-gray-400">Spielstärke:</span>
          <StrengthDots value={game.staerke} />
        </div>
        {game.wichtige_infos && (
          <div className="mt-2 px-2.5 py-1.5 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-200">
            ℹ️ {game.wichtige_infos}
          </div>
        )}
      </div>
    </div>
  );
}

function SchiriBörsenKarte({ game, userLocation, onBewerben }) {
  const dist = userLocation && game.lat && game.lng ? haversine(userLocation.lat, userLocation.lng, game.lat, game.lng) : null;
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const c = kategorieColor(kat);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-3" style={{ borderLeft: "4px solid #F5D87A" }}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex gap-1.5 flex-wrap">
            <InlineBadge bg="#FFFBE6" color="#7A5C00" border="#F5D87A">🟡 Schiri gesucht</InlineBadge>
            {kat && <InlineBadge bg={c.bg} color={c.text} border={c.border}>{kat}</InlineBadge>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {dist !== null && <span className="text-xs text-gray-400">{dist} km</span>}
            <span className="text-xs text-gray-500 font-medium">{formatDate(game.datum)}</span>
          </div>
        </div>
        <p className="font-semibold text-gray-900 text-base mb-0.5">{game.verein}</p>
        <p className="text-sm text-gray-500 mb-3">{mannschaft}</p>
        <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-3 mb-4">
          <span className="text-xs text-gray-500">🕐 {game.uhrzeit} Uhr</span>
          {game.platz && <span className="text-xs text-gray-500">📍 {game.platz}</span>}
          {game.spieldauer && <span className="text-xs text-gray-500">⏱️ {game.spieldauer} min</span>}
        </div>
        {game.schiri_status !== "besetzt" ? (
          <button onClick={() => onBewerben(game)} className="w-full py-2.5 bg-amber-700 text-white rounded-lg text-sm font-semibold hover:bg-amber-800 transition-colors">
            🟡 Als Schiedsrichter bewerben
          </button>
        ) : (
          <div className="text-center py-2 bg-green-50 rounded-lg text-sm text-green-800 font-medium">✓ Schiedsrichter bereits bestätigt</div>
        )}
      </div>
    </div>
  );
}

function BenachrichtigungenBanner({ session, onNavigateMeine }) {
  const [ungelesen, setUngelesen] = useState([]);

  useEffect(() => {
    if (!session) return;
    supabase.from("buchungen").select("*").eq("anbieter_email", session.user.email).eq("gelesen", false)
      .then(({ data }) => { if (data) setUngelesen(data); });
  }, [session]);

  async function allesGelesen() {
    await supabase.from("buchungen").update({ gelesen: true }).in("id", ungelesen.map((b) => b.id));
    setUngelesen([]);
    onNavigateMeine();
  }

  if (ungelesen.length === 0) return null;

  return (
    <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
      <div className="w-7 h-7 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">{ungelesen.length}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-brand-900">
          {ungelesen.length === 1 ? "1 Spiel wurde angenommen!" : `${ungelesen.length} Spiele wurden angenommen!`}
        </p>
        <p className="text-xs text-brand-600">{ungelesen.map((b) => `${b.bucher_verein} · ${b.datum}`).join(" | ")}</p>
      </div>
      <button onClick={allesGelesen} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold flex-shrink-0">
        Ansehen
      </button>
    </div>
  );
}

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
    <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto border border-gray-100 shadow-2xl">
        <h3 className="text-lg font-bold mb-1">🟡 Als Schiedsrichter bewerben</h3>
        <p className="text-sm text-gray-500 mb-5">{game.verein} · {formatDate(game.datum)} · {game.uhrzeit} Uhr</p>
        <div className="space-y-3">
          {[
            { label: "Dein Name", key: "name", type: "text", placeholder: "Vor- und Nachname" },
            { label: "Deine Telefonnummer", key: "telefon", type: "tel", placeholder: "+49 …" },
            { label: "Nachricht (optional)", key: "nachricht", type: "text", placeholder: "Erfahrung mit dieser Altersklasse…" },
          ].map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="input" />
            </div>
          ))}
          <div>
            <label className="label">Lizenz</label>
            <select value={form.lizenz} onChange={(e) => setForm({ ...form, lizenz: e.target.value })} className="input">
              {SCHIRI_LIZENZEN.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full justify-center mt-5" style={{ opacity: loading ? 0.7 : 1 }}>
          {loading ? "Wird gesendet…" : "Bewerbung absenden"}
        </button>
        <button onClick={onClose} className="w-full py-2.5 text-sm text-gray-400 hover:text-gray-600 mt-2">Abbrechen</button>
      </div>
    </div>
  );
}

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
    <div onClick={onClose} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto border border-gray-100 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-sm text-gray-500 hover:bg-gray-100">✕</button>
        <h3 className="text-lg font-bold mb-1">🟡 Schiedsrichter-Bewerbungen</h3>
        <p className="text-sm text-gray-500 mb-5">{game.verein} · {formatDate(game.datum)}</p>
        {laden ? (
          <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : anfragen.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Noch keine Bewerbungen.</div>
        ) : (
          <div className="space-y-3">
            {anfragen.map((a) => (
              <div key={a.id} className={`bg-gray-50 rounded-xl p-4 border ${a.status === "bestaetigt" ? "border-green-200" : a.status === "abgelehnt" ? "border-red-200" : "border-gray-200"}`}>
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-gray-900">{a.schiri_name}</p>
                  {a.status === "bestaetigt" && <InlineBadge bg="#E8F8F2" color="#0C4D38" border="#A8DFC4">✓ Bestätigt</InlineBadge>}
                  {a.status === "abgelehnt" && <InlineBadge bg="#FCEBEB" color="#791F1F" border="#F09595">✗ Abgelehnt</InlineBadge>}
                  {a.status === "offen" && <InlineBadge bg="#FFFBE6" color="#7A5C00" border="#F5D87A">Offen</InlineBadge>}
                </div>
                <p className="text-sm text-brand-600 mb-1">{a.schiri_tel}</p>
                {a.schiri_lizenz && <p className="text-xs text-gray-500 mb-1">🟡 {a.schiri_lizenz}</p>}
                {a.nachricht && <p className="text-xs text-gray-400 italic mb-3">"{a.nachricht}"</p>}
                {a.status === "offen" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => ablehnen(a)} className="btn-secondary text-sm">Ablehnen</button>
                    <button onClick={() => bestaetigen(a)} className="btn-primary text-sm justify-center">✓ Bestätigen</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



function MeineSpielZeile({ game, onNavigate, onEdit, onOnlineStellen, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const isGebucht = game.status === "gebucht";

  return (
    <div className="flex items-center gap-3 py-3.5 px-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs text-gray-500">{formatDate(game.datum)} · {game.uhrzeit} Uhr</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isGebucht ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {isGebucht ? "Gebucht" : "Offen"}
          </span>
        </div>
        <p className="font-semibold text-gray-900 text-sm truncate">{game.verein}</p>
        <p className="text-xs text-gray-400 truncate">
          {mannschaft}{kat ? ` · ${kat}` : ""}{game.platz ? ` · ${game.platz}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => onNavigate(game)} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">Details</button>
        <button onClick={() => onEdit(game)} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">Bearbeiten</button>
        {confirmDelete ? (
          <>
            <button onClick={() => setConfirmDelete(false)} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors">Nein</button>
            <button onClick={() => onDelete(game.id)} className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Ja</button>
          </>
        ) : isGebucht ? (
          <button onClick={() => onOnlineStellen(game.id)} className="px-2.5 py-1.5 text-xs text-brand-600 font-medium hover:text-brand-700 transition-colors">Wieder online</button>
        ) : (
          <button onClick={() => setConfirmDelete(true)} className="px-2.5 py-1.5 text-xs text-red-500 font-medium hover:text-red-700 transition-colors">Absagen</button>
        )}
      </div>
    </div>
  );
}

function AnfrageZeile({ game, buchung, onNavigate }) {
  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  return (
    <div className="flex items-center gap-3 py-3.5 px-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs text-gray-500">{formatDate(game.datum)} · {game.uhrzeit} Uhr</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Gebucht</span>
        </div>
        <p className="font-semibold text-gray-900 text-sm truncate">{game.verein}</p>
        <p className="text-xs text-gray-400 truncate">
          {mannschaft}{kat ? ` · ${kat}` : ""}{buchung ? ` · Kontakt: ${buchung.anbieter_name}` : ""}
        </p>
      </div>
      <button onClick={() => onNavigate(game)} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">Details</button>
    </div>
  );
}

const FILTER_KAT = ["Alle", "Angebote", "Anfragen", "Junioren", "Juniorinnen", "Herren", "Damen", "Schiri gesucht"];

function ListeTab({ games, userLocation, laden, onSelectGame }) {
  const [activeFilter, setActiveFilter] = useState("Alle");
  const [sortBy, setSortBy] = useState("neu");

  const heute = new Date().toISOString().slice(0, 10);
  const filtered = games.filter((g) => {
    if (g.datum < heute) return false;
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
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {FILTER_KAT.map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
              activeFilter === f ? "bg-brand-600 text-white border-brand-600" : "border-gray-200 text-gray-500 bg-white hover:border-brand-300"
            }`}>
            {f}
          </button>
        ))}
      </div>
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
      {!laden && sortiert.length > 0 && (
        <p className="text-xs text-gray-400 mb-3">{sortiert.length} {sortiert.length === 1 ? "Eintrag" : "Einträge"}</p>
      )}
      {laden ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sortiert.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-lg mb-1">Keine Einträge</p>
          <p className="text-sm">Noch keine Spiele vorhanden.</p>
        </div>
      ) : (
        sortiert.map((g) => <GameCard key={g.id} game={g} userLocation={userLocation} onClick={onSelectGame} />)
      )}
    </div>
  );
}

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
          <div><label className="label">Uhrzeit</label><input type="time" className="input" value={form.uhrzeit} onChange={(e) => set("uhrzeit", e.target.value)} /></div>
        </div>
        <div>
          <label className="label">Rasenart</label>
          <select className="input" value={form.rasen} onChange={(e) => set("rasen", e.target.value)}>
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
              const aktiv = parseInt(form.spieldauer) === min;
              return (
                <button key={min} onClick={() => set("spieldauer", aktiv ? "" : min)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${aktiv ? "bg-brand-50 text-brand-800 border-brand-300 font-semibold" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                  {aktiv ? "✓ " : ""}{min} min
                </button>
              );
            })}
          </div>
          <input type="number" placeholder="Eigene Dauer…" min={10} max={180} value={form.spieldauer} onChange={(e) => set("spieldauer", e.target.value)} className="input text-sm" />
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

      <div className="card space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{type === "angebot" ? "Ort" : "Dein Standort"}</p>
        {type === "angebot" ? (
          <>
            <div><label className="label">Sportplatz Name</label><input type="text" className="input" placeholder="z.B. Sportpark Nord" value={form.platz} onChange={(e) => set("platz", e.target.value)} /></div>
            <div><label className="label">Adresse</label><input type="text" className="input" placeholder="Musterstr. 1, 68159 Mannheim" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} /></div>
          </>
        ) : (
          <div><label className="label">Stadt / PLZ</label><input type="text" className="input" placeholder="z.B. Mannheim oder 68159" value={form.adresse} onChange={(e) => set("adresse", e.target.value)} /></div>
        )}
      </div>

      <div className="card space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trainer & Verein</p>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Name</label><input type="text" className="input" placeholder="Vor- Nachname" value={form.trainer_name} onChange={(e) => set("trainer_name", e.target.value)} /></div>
          <div><label className="label">Telefon</label><input type="tel" className="input" placeholder="+49 …" value={form.telefon} onChange={(e) => set("telefon", e.target.value)} /></div>
        </div>
        <div><label className="label">Verein</label><input type="text" className="input" placeholder="z.B. FC Mannheim" value={form.verein} onChange={(e) => set("verein", e.target.value)} /></div>
      </div>

      <button onClick={handleSubmit} disabled={laden} className="btn-primary w-full justify-center" style={{ opacity: laden ? 0.6 : 1 }}>
        {laden ? "Wird gespeichert…" : "Veröffentlichen"}
      </button>
    </div>
  );
}

function SchiriBörseTab({ games, userLocation, session, onRefresh }) {
  const [sortBy, setSortBy] = useState("datum_asc");
  const [bewerbungGame, setBewerbungGame] = useState(null);
  const [toast, setToast] = useState("");

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 2500); }
  const offeneSpiele = sortiereSpiele(games.filter((g) => g.schiri_benoetigt && g.schiri_status !== "besetzt"), sortBy, userLocation);

  return (
    <div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
        <p className="font-semibold text-sm text-amber-800 mb-0.5">🟡 Schiedsrichter-Börse</p>
        <p className="text-xs text-amber-700">Alle Spiele die einen Schiedsrichter suchen.</p>
      </div>
      {toast && <Toast message={toast} />}
      <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
      {offeneSpiele.length === 0 ? (
        <div className="card text-center py-16 text-gray-400 text-sm">Aktuell keine Spiele mit Schiedsrichter-Bedarf.</div>
      ) : (
        offeneSpiele.map((g) => <SchiriBörsenKarte key={g.id} game={g} userLocation={userLocation} onBewerben={setBewerbungGame} />)
      )}
      {bewerbungGame && (
        <SchiriBewerbungModal game={bewerbungGame} onClose={() => setBewerbungGame(null)} onConfirm={() => { setBewerbungGame(null); showToast("Bewerbung erfolgreich gesendet!"); onRefresh(); }} />
      )}
    </div>
  );
}

function SucheTab({ games, userLocation, onSelectGame }) {
  const [results, setResults] = useState(null);
  const [sortBy, setSortBy] = useState("datum_asc");
  const [km, setKm] = useState(30);
  const [typ, setTyp] = useState("");
  const [datum, setDatum] = useState("");
  const [staerke, setStaerke] = useState("");
  const [rasen, setRasen] = useState("");
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
    <div className="space-y-4">
      {!userLocation && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 font-medium">
          ⚠️ Kein Standort gesetzt.
        </div>
      )}

      <div className="card">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Mannschaft</p>
        <div className="flex gap-1 mb-2.5 bg-gray-100 rounded-xl p-1">
          {["Alle", ...Object.keys(MANNSCHAFTEN)].map((kat) => {
            const c = kategorieColor(kat);
            const aktiv = aktiveKat === kat;
            const hat = kat !== "Alle" && ausgewaehlt.some((m) => getKategorie(m) === kat);
            return (
              <button key={kat}
                onClick={() => { setAktiveKat(kat); if (kat === "Alle") setAusgewaehlt([]); }}
                style={aktiv && kat !== "Alle" ? { background: c.bg, color: c.text, borderColor: c.border } : {}}
                className={`flex-1 py-1.5 px-1 rounded-lg text-xs font-semibold transition-colors border ${aktiv ? (kat === "Alle" ? "bg-brand-600 text-white border-brand-600" : "") : "border-transparent bg-transparent text-gray-400"}`}>
                {kat}{hat && <span className="inline-block w-1.5 h-1.5 rounded-full ml-1 mb-0.5" style={{ background: c.text, verticalAlign: "middle" }} />}
              </button>
            );
          })}
        </div>
        {aktiveKat !== "Alle" && (
          <div className="flex flex-col gap-1.5">
            {MANNSCHAFTEN[aktiveKat].map((m) => {
              const aktiv = ausgewaehlt.includes(m);
              const c = kategorieColor(aktiveKat);
              return (
                <button key={m} onClick={() => toggleM(m)}
                  style={aktiv ? { background: c.bg, color: c.text, borderColor: c.border } : {}}
                  className={`px-3.5 py-2.5 rounded-lg text-sm text-left transition-colors border ${aktiv ? "font-semibold" : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"}`}>
                  {aktiv ? "✓ " : ""}{m}
                </button>
              );
            })}
            {ausgewaehlt.length > 0 && (
              <button onClick={() => setAusgewaehlt([])} className="btn-ghost text-sm">Auswahl zurücksetzen</button>
            )}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Weitere Filter</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Typ</label>
            <select className="input" value={typ} onChange={(e) => setTyp(e.target.value)}>
              <option value="">Alle</option><option value="angebot">Angebot</option><option value="anfrage">Anfrage</option>
            </select>
          </div>
          <div>
            <label className="label">Spielstärke</label>
            <select className="input" value={staerke} onChange={(e) => setStaerke(e.target.value)}>
              <option value="">Egal</option>{[1,2,3,4,5].map((n) => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Datum ab</label>
            <input type="date" className="input" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>
          <div>
            <label className="label">Rasen</label>
            <select className="input" value={rasen} onChange={(e) => setRasen(e.target.value)}>
              <option value="">Egal</option>{["Naturrasen","Kunstrasen","Hartplatz","Halle"].map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Umkreis: <strong className="text-gray-900">{km} km</strong>{userLocation ? ` ab ${userLocation.label}` : ""}</label>
          <input type="range" min={5} max={150} step={5} value={km} onChange={(e) => setKm(parseInt(e.target.value))} className="w-full" style={{ accentColor: "#1D9E75" }} />
        </div>
        <div>
          <label className="label">Sortierung</label>
          <SortierBar sortBy={sortBy} onChange={setSortBy} userLocation={userLocation} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={reset} className="btn-secondary text-sm">Zurücksetzen</button>
          <button onClick={search} className="btn-primary text-sm justify-center">Suchen</button>
        </div>
      </div>

      {results !== null && (
        <>
          <p className="text-xs text-gray-400">{results.length} {results.length === 1 ? "Ergebnis" : "Ergebnisse"}</p>
          {results.length === 0 ? (
            <div className="card text-center py-8 text-gray-400 text-sm">Keine Spiele gefunden</div>
          ) : (
            results.map((g) => <GameCard key={g.id} game={g} userLocation={userLocation} onClick={onSelectGame} />)
          )}
        </>
      )}
    </div>
  );
}

function MeineTab({ userLocation, onSelectGame, session, allGames, onEdit, onOnlineStellen, onDelete, onEintragen }) {
  const [meineBuchungen, setMeineBuchungen] = useState([]);
  const [buchungsSpiele, setBuchungsSpiele] = useState([]);
  const [laden, setLaden] = useState(true);
  const [activeSection, setActiveSection] = useState("eigene");

  useEffect(() => {
    async function ladeBuchungen() {
      const { data: buchungen } = await supabase.from("buchungen").select("*").eq("bucher_email", session.user.email);
      if (!buchungen || buchungen.length === 0) { setLaden(false); return; }
      const gameIds = buchungen.map((b) => b.game_id);
      const { data: spiele } = await supabase.from("games").select("*").in("id", gameIds);
      if (spiele) setBuchungsSpiele(spiele);
      setMeineBuchungen(buchungen);
      setLaden(false);
    }
    ladeBuchungen();
  }, [session]);

  const eigeneSpiele = allGames
    .filter((g) => g.anbieter_email === session.user.email)
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const sortierteAnfragen = buchungsSpiele.sort((a, b) => a.datum.localeCompare(b.datum));

  if (laden) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-gray-900">Meine Spiele</h2>
        <button onClick={onEintragen} className="btn-primary text-sm">+ Eintragen</button>
      </div>

      <div className="flex mb-5 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setActiveSection("eigene")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${activeSection === "eigene" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
          Ausgeschrieben ({eigeneSpiele.length})
        </button>
        <button onClick={() => setActiveSection("anfragen")}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${activeSection === "anfragen" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"}`}>
          Meine Anfragen ({sortierteAnfragen.length})
        </button>
      </div>

      {activeSection === "eigene" && (
        eigeneSpiele.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
            <p className="text-base mb-1">Noch keine Spiele</p>
            <p className="text-sm">Erstelle dein erstes Spiel mit „+ Eintragen"</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {eigeneSpiele.map((g) => (
              <MeineSpielZeile key={g.id} game={g}
                onNavigate={onSelectGame} onEdit={onEdit}
                onOnlineStellen={onOnlineStellen} onDelete={onDelete} />
            ))}
          </div>
        )
      )}

      {activeSection === "anfragen" && (
        sortierteAnfragen.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-16 text-gray-400">
            <p className="text-base mb-1">Keine Anfragen</p>
            <p className="text-sm">Finde ein Spiel im Tab „Spiele"</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {sortierteAnfragen.map((g) => {
              const buchung = meineBuchungen.find((b) => b.game_id === g.id);
              return <AnfrageZeile key={g.id} game={g} buchung={buchung} onNavigate={onSelectGame} />;
            })}
          </div>
        )
      )}
    </div>
  );
}

const TAB_TITLES = { liste: "Spiele", neu: "Spiel eintragen", suche: "Suchen", boerse: "Schiri-Börse", meine: "Meine Spiele" };

export default function Matches() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = searchParams.get("tab") || "liste";

  const [session, setSession] = useState(null);
  const [games, setGames] = useState([]);
  const [laden, setLaden] = useState(false);
  const [editGame, setEditGame] = useState(null);
  const [toast, setToast] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [showStandortModal, setShowStandortModal] = useState(false);

  const rolle = session?.user?.user_metadata?.rolle || "trainer";
  const istSchiri = rolle === "schiedsrichter";

  function setTab(tab) { tab === "liste" ? setSearchParams({}) : setSearchParams({ tab }); }

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
      anbieter_email: session.user.email,
    }]).select();
    if (error) { alert("Fehler: " + error.message); return; }
    await ladeSpiele();
    showToast("Erfolgreich veröffentlicht!");
    setTab("meine");
  }

  async function handleEditGame(gameId, formData) {
    const { error } = await supabase.from("games").update({
      type: formData.type, mannschaft: formData.mannschaft, datum: formData.datum, uhrzeit: formData.uhrzeit,
      rasen: formData.rasen, staerke: formData.staerke, platz: formData.platz || null, adresse: formData.adresse || null,
      trainer_name: formData.trainer_name, telefon: formData.telefon, verein: formData.verein,
      umkreis_km: formData.umkreis_km || null, spielfeld_groesse: formData.spielfeld_groesse || null,
      spieldauer: formData.spieldauer ? parseInt(formData.spieldauer) : null, wichtige_infos: formData.wichtige_infos || null,
      schiri_benoetigt: formData.schiri_benoetigt || false, schiri_status: formData.schiri_status || null,
    }).eq("id", gameId);
    if (error) { alert("Fehler: " + error.message); return; }
    await ladeSpiele();
    setEditGame(null);
    showToast("Spiel erfolgreich aktualisiert!");
  }

  async function handleDeleteGame(gameId) {
    await supabase.from("buchungen").delete().eq("game_id", gameId);
    await supabase.from("schiri_anfragen").delete().eq("game_id", gameId);
    const { error } = await supabase.from("games").delete().eq("id", gameId);
    if (error) { alert("Fehler: " + error.message); return; }
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    showToast("Spiel gelöscht.");
  }

  async function handleSpieleOnline(gameId) {
    const { error } = await supabase.from("games").update({ status: "offen" }).eq("id", gameId);
    if (error) { alert("Fehler: " + error.message); return; }
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, status: "offen" } : g));
    showToast("Spiel wieder online gestellt!");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{TAB_TITLES[activeTab] || "Spiele"}</h1>
        <button onClick={() => setShowStandortModal(true)}
          className={`btn-ghost text-sm ${userLocation ? "text-brand-600" : ""}`}>
          📍 {userLocation ? userLocation.label : "Standort setzen"}
        </button>
      </div>

      {!istSchiri && session && (
        <BenachrichtigungenBanner session={session} onNavigateMeine={() => setTab("meine")} />
      )}

      <Toast message={toast} />

      {activeTab === "liste" && <ListeTab games={games} userLocation={userLocation} laden={laden} onSelectGame={(g) => navigate('/spiele/' + g.id)} />}
      {activeTab === "neu" && !istSchiri && <EintragenTab onSubmit={handleAddGame} />}
      {activeTab === "suche" && <SucheTab games={games} userLocation={userLocation} onSelectGame={(g) => navigate('/spiele/' + g.id)} />}
      {activeTab === "boerse" && <SchiriBörseTab games={games} userLocation={userLocation} session={session} onRefresh={ladeSpiele} />}
      {activeTab === "meine" && !istSchiri && session && <MeineTab userLocation={userLocation} onSelectGame={(g) => navigate('/spiele/' + g.id)} session={session} allGames={games} onEdit={setEditGame} onOnlineStellen={handleSpieleOnline} onDelete={handleDeleteGame} onEintragen={() => setTab("neu")} />}

      {editGame && <SpieleEditModal game={editGame} onClose={() => setEditGame(null)} onSave={handleEditGame} />}
      {showStandortModal && <StandortModal onClose={() => setShowStandortModal(false)} onSave={(loc) => { setUserLocation(loc); setShowStandortModal(false); showToast(`Standort: ${loc.label}`); }} />}
    </div>
  );
}
