import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatDate, getKategorie, StrengthDots, BookingModal, SpieleEditModal } from "../lib/gameShared";

function InfoRow({ label, value, href }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      {href ? (
        <a href={href} className="text-sm font-medium text-brand-600 hover:underline ml-4">{value}</a>
      ) : (
        <span className="text-sm font-medium text-gray-900 text-right ml-4">{value}</span>
      )}
    </div>
  );
}

function ChatBox({ gameId, session, senderName }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    supabase.from("messages").select("*").eq("game_id", gameId).order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

    const channel = supabase.channel(`messages-${gameId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `game_id=eq.${gameId}` },
        (payload) => setMessages((prev) => [...prev, payload.new]))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [gameId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput("");
    await supabase.from("messages").insert([{
      game_id: gameId,
      sender_email: session.user.email,
      sender_name: senderName,
      message: text,
    }]);
    setSending(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <span className="font-semibold text-gray-900 text-sm">Chat</span>
      </div>
      <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-sm text-gray-400 text-center pt-8">Noch keine Nachrichten. Schreib die erste!</p>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_email === session.user.email;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${isOwn ? "bg-brand-600 text-white rounded-br-sm" : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"}`}>
                  {!isOwn && <p className="text-xs font-semibold mb-0.5 text-gray-500">{msg.sender_name}</p>}
                  <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                  <p className={`text-xs mt-0.5 ${isOwn ? "text-brand-200" : "text-gray-400"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-100 p-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Nachricht schreiben…"
          className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-brand-400 focus:bg-white transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={sending || !input.trim()}
          className="px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-brand-700 transition-colors"
        >
          →
        </button>
      </div>
    </div>
  );
}

export default function GameDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [session, setSession] = useState(null);
  const [laden, setLaden] = useState(true);
  const [anfragen, setAnfragen] = useState([]);
  const [buchung, setBuchung] = useState(null);
  const [showBuchung, setShowBuchung] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    supabase.from("games").select("*").eq("id", id).single()
      .then(({ data }) => { setGame(data || null); setLaden(false); });
  }, [id]);

  useEffect(() => {
    if (!game || !session) return;
    if (game.anbieter_email === session.user?.email) {
      supabase.from("buchungen").select("*").eq("game_id", id)
        .then(({ data }) => { if (data) setAnfragen(data); });
    }
    if (game.status === "gebucht") {
      supabase.from("buchungen").select("*").eq("game_id", id).single()
        .then(({ data }) => { if (data) setBuchung(data); });
    }
  }, [game, session, id]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleBooking(formData) {
    await supabase.from("games").update({ status: "gebucht" }).eq("id", id);
    await supabase.from("buchungen").insert([{
      game_id: id,
      anbieter_name: game.trainer_name, anbieter_tel: game.telefon,
      anbieter_verein: game.verein, anbieter_email: game.anbieter_email || "",
      bucher_name: formData.name, bucher_verein: formData.verein,
      bucher_tel: formData.tel, bucher_mannschaft: formData.mannschaft || null,
      bucher_nachricht: formData.msg || null, bucher_email: session?.user?.email || "",
      datum: formatDate(game.datum), uhrzeit: game.uhrzeit, gelesen: false,
    }]);
    setGame((g) => ({ ...g, status: "gebucht" }));
    setShowBuchung(false);
    showToast("Anfrage erfolgreich gesendet!");
  }

  async function handleEdit(gameId, formData) {
    const { error } = await supabase.from("games").update({
      type: formData.type, mannschaft: formData.mannschaft, datum: formData.datum, uhrzeit: formData.uhrzeit,
      rasen: formData.rasen, staerke: formData.staerke, platz: formData.platz || null, adresse: formData.adresse || null,
      trainer_name: formData.trainer_name, telefon: formData.telefon, verein: formData.verein,
      umkreis_km: formData.umkreis_km || null, spielfeld_groesse: formData.spielfeld_groesse || null,
      spieldauer: formData.spieldauer ? parseInt(formData.spieldauer) : null,
      wichtige_infos: formData.wichtige_infos || null,
      schiri_benoetigt: formData.schiri_benoetigt || false, schiri_status: formData.schiri_status || null,
    }).eq("id", gameId);
    if (error) { alert("Fehler: " + error.message); return; }
    setGame((g) => ({ ...g, ...formData, staerke: formData.staerke }));
    setShowEdit(false);
    showToast("Spiel aktualisiert!");
  }

  async function handleOnlineStellen() {
    await supabase.from("games").update({ status: "offen" }).eq("id", id);
    setGame((g) => ({ ...g, status: "offen" }));
    showToast("Spiel wieder online gestellt!");
  }

  if (laden) return (
    <div className="flex justify-center items-center py-32">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!game) return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <p className="text-2xl font-bold text-gray-900 mb-2">Spiel nicht gefunden</p>
      <button onClick={() => navigate("/spiele")} className="btn-primary mt-4">← Zurück zu Spiele</button>
    </div>
  );

  const mannschaft = game.mannschaft || game.jugend || "";
  const kat = getKategorie(mannschaft);
  const isOffer = game.type === "angebot";
  const istEigenesSpiel = session?.user?.email && game.anbieter_email === session.user.email;
  const istBucher = buchung && session?.user?.email === buchung.bucher_email;
  const darfChatten = game.status === "gebucht" && (istEigenesSpiel || istBucher);
  const senderName = istEigenesSpiel ? game.trainer_name : buchung?.bucher_name || session?.user?.email || "";
  const mapsUrl = game.adresse ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(game.adresse)}` : null;

  return (
    <div className="min-h-screen" style={{ background: "#f4f4f5" }}>
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-brand-600 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-lg whitespace-nowrap">
          ✓ {toast}
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/spiele")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
          ← Zurück zu Spiele
        </button>

        <div className="mb-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{game.verein}</h1>
              <p className="text-gray-500 mt-0.5 text-sm">
                {mannschaft}
                {kat ? ` · ${kat}` : ""}
                {isOffer ? " · Angebot" : " · Anfrage"}
              </p>
            </div>
            <span className={`text-sm font-semibold flex-shrink-0 mt-1 ${game.status === "gebucht" ? "text-red-500" : "text-brand-600"}`}>
              {game.status === "gebucht" ? "Gebucht" : "Offen"}
            </span>
          </div>
        </div>

        <div className="space-y-3">

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <InfoRow label="Datum" value={formatDate(game.datum)} />
            <InfoRow label="Anpfiff" value={`${game.uhrzeit} Uhr`} />
            <InfoRow label="Mannschaft" value={mannschaft} />
            <InfoRow label="Rasenart" value={game.rasen} />
            {game.spielfeld_groesse && <InfoRow label="Spielfeld" value={game.spielfeld_groesse} />}
            {game.spieldauer && <InfoRow label="Spieldauer" value={`${game.spieldauer} Minuten`} />}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-500">Spielstärke</span>
              <div className="flex items-center gap-2">
                <StrengthDots value={game.staerke} />
                <span className="text-sm text-gray-400">({game.staerke}/5)</span>
              </div>
            </div>
            <InfoRow label="Trainer" value={game.trainer_name} />
            <InfoRow label="Telefon" value={game.telefon} href={`tel:${game.telefon}`} />
          </div>

          {(game.platz || game.adresse) && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">Spielort</span>
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-600 font-medium hover:underline">
                    Route planen →
                  </a>
                )}
              </div>
              {game.platz && <InfoRow label="Name" value={game.platz} />}
              {game.adresse && <InfoRow label="Adresse" value={game.adresse} />}
            </div>
          )}

          {game.wichtige_infos && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">Wichtige Infos</span>
              </div>
              <p className="px-4 py-3 text-sm text-gray-700 leading-relaxed">{game.wichtige_infos}</p>
            </div>
          )}

          {game.schiri_benoetigt && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="font-semibold text-gray-900 text-sm">Schiedsrichter</span>
                <span className={`text-sm font-medium ${game.schiri_status === "besetzt" ? "text-brand-600" : "text-amber-600"}`}>
                  {game.schiri_status === "besetzt" ? "Bestätigt" : game.schiri_status === "angefragt" ? "Bewerbungen eingegangen" : "Gesucht"}
                </span>
              </div>
            </div>
          )}

          {/* Anfragen — nur für Ersteller */}
          {istEigenesSpiel && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-gray-900 text-sm">Anfragen ({anfragen.length})</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowEdit(true)} className="text-sm text-gray-600 border border-gray-300 px-3 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                    Bearbeiten
                  </button>
                  {game.status === "gebucht" ? (
                    <button onClick={handleOnlineStellen} className="text-sm text-brand-600 font-medium hover:underline">
                      Wieder online
                    </button>
                  ) : (
                    <button onClick={handleOnlineStellen} className="text-sm text-red-500 font-medium hover:underline">
                      Absagen
                    </button>
                  )}
                </div>
              </div>
              {anfragen.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">Noch keine Anfragen eingegangen.</p>
              ) : (
                anfragen.map((a, i) => (
                  <div key={a.id} className={`px-4 py-3 ${i < anfragen.length - 1 ? "border-b border-gray-100" : ""}`}>
                    <p className="text-sm font-semibold text-gray-900">{a.bucher_name} · {a.bucher_verein}</p>
                    {a.bucher_mannschaft && <p className="text-sm text-gray-500">{a.bucher_mannschaft}</p>}
                    <a href={`tel:${a.bucher_tel}`} className="text-sm text-brand-600 font-medium hover:underline">{a.bucher_tel}</a>
                    {a.bucher_nachricht && <p className="text-xs text-gray-400 italic mt-0.5">"{a.bucher_nachricht}"</p>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Chat — für beide Parteien wenn Spiel gebucht */}
          {darfChatten && (
            <ChatBox gameId={id} session={session} senderName={senderName} />
          )}

          {/* CTA für andere Nutzer */}
          {!istEigenesSpiel && (
            <div className="pb-4">
              {game.status !== "gebucht" ? (
                <button onClick={() => setShowBuchung(true)}
                  className="w-full py-3.5 bg-brand-600 text-white rounded-xl text-base font-semibold hover:bg-brand-700 transition-colors">
                  Spiel anfragen
                </button>
              ) : !istBucher ? (
                <div className="text-center py-3.5 text-sm text-gray-400 bg-white border border-gray-200 rounded-xl">
                  Bereits vergeben
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {showBuchung && (
        <BookingModal game={game} onClose={() => setShowBuchung(false)} onConfirm={handleBooking} />
      )}
      {showEdit && (
        <SpieleEditModal game={game} onClose={() => setShowEdit(false)} onSave={handleEdit} />
      )}
    </div>
  );
}
