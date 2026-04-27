import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [rolle, setRolle] = useState("trainer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [datenschutz, setDatenschutz] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showDatenschutz, setShowDatenschutz] = useState(false);

  async function handleLogin() {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("Login fehlgeschlagen. E-Mail oder Passwort falsch.");
    setLoading(false);
  }

  async function handleRegister() {
    setLoading(true); setError(""); setSuccess("");
    if (password.length < 6) { setError("Passwort muss mindestens 6 Zeichen lang sein."); setLoading(false); return; }
    if (!datenschutz) { setError("Bitte stimme der Datenschutzerklärung zu."); setLoading(false); return; }
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { rolle } }, // Rolle wird in user_metadata gespeichert
    });
    if (error) setError("Registrierung fehlgeschlagen: " + error.message);
    else setSuccess("Registrierung erfolgreich! Du kannst dich jetzt anmelden.");
    setLoading(false);
  }

  function handleSubmit() {
    if (!email || !password) { setError("Bitte E-Mail und Passwort eingeben."); return; }
    if (mode === "login") handleLogin();
    else handleRegister();
  }

  const rollenOptionen = [
    { val: "trainer", label: "⚽ Trainer", desc: "Spiele anbieten & anfragen" },
    { val: "schiedsrichter", label: "🟡 Schiedsrichter", desc: "Spiele pfeifen & Einsätze finden" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5", padding: 16 }}>
      <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: 52, height: 52, background: "#1D9E75", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px" }}>⚽</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a" }}>KickMatch</div>
          <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>Freundschaftsspiele koordinieren</div>
        </div>

        {/* Modus-Umschalter */}
        <div style={{ display: "flex", background: "#f0f2f5", borderRadius: 10, padding: 4, marginBottom: "1.25rem" }}>
          {[{ val: "login", label: "Anmelden" }, { val: "register", label: "Registrieren" }].map((btn) => (
            <button key={btn.val} onClick={() => { setMode(btn.val); setError(""); setSuccess(""); }}
              style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: mode === btn.val ? "white" : "transparent", color: mode === btn.val ? "#1a1a1a" : "#888", boxShadow: mode === btn.val ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {btn.label}
            </button>
          ))}
        </div>

        {/* Rollenauswahl — nur bei Registrierung */}
        {mode === "register" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#555", marginBottom: 8 }}>Ich bin...</div>
            <div style={{ display: "flex", gap: 8 }}>
              {rollenOptionen.map((r) => (
                <button key={r.val} onClick={() => setRolle(r.val)}
                  style={{ flex: 1, padding: "12px 8px", border: `2px solid ${rolle === r.val ? "#1D9E75" : "#ddd"}`, borderRadius: 10, cursor: "pointer", background: rolle === r.val ? "#E1F5EE" : "white", textAlign: "center" }}>
                  <div style={{ fontSize: 16, marginBottom: 4 }}>{r.label.split(" ")[0]}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: rolle === r.val ? "#085041" : "#444" }}>{r.label.split(" ").slice(1).join(" ")}</div>
                  <div style={{ fontSize: 11, color: rolle === r.val ? "#0F6E56" : "#888", marginTop: 2 }}>{r.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fehler / Erfolg */}
        {error && <div style={{ background: "#FCEBEB", border: "1px solid #F09595", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#791F1F", marginBottom: 14 }}>{error}</div>}
        {success && <div style={{ background: "#EAF3DE", border: "1px solid #C0DD97", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#27500A", marginBottom: 14 }}>{success}</div>}

        {/* Formular */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 }}>E-Mail-Adresse</label>
          <input type="email" placeholder="trainer@beispiel.de" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: mode === "register" ? 14 : 20 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 }}>Passwort</label>
          <input type="password" placeholder={mode === "register" ? "Mindestens 6 Zeichen" : "Dein Passwort"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #ddd", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box" }}
            autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </div>

        {/* Datenschutz */}
        {mode === "register" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={datenschutz} onChange={(e) => setDatenschutz(e.target.checked)} style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "#1D9E75" }} />
              <span style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
                Ich habe die{" "}
                <span onClick={(e) => { e.preventDefault(); setShowDatenschutz(true); }} style={{ color: "#185FA5", textDecoration: "underline", cursor: "pointer" }}>Datenschutzerklärung</span>{" "}
                gelesen und stimme zu.
              </span>
            </label>
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "12px 0", background: loading ? "#aaa" : "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Bitte warten..." : mode === "login" ? "Anmelden" : "Konto erstellen"}
        </button>

        <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
          Deine Daten werden ausschließlich für KickMatch verwendet.
        </div>
      </div>

      {/* Datenschutz-Modal */}
      {showDatenschutz && (
        <div onClick={() => setShowDatenschutz(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setShowDatenschutz(false)} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", border: "1px solid #e0e0e0", background: "#f5f5f5", cursor: "pointer", fontSize: 13 }}>✕</button>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Datenschutzerklärung</div>
            {[
              { titel: "1. Verantwortlicher", text: "Verantwortlich für die Datenverarbeitung ist der Betreiber der KickMatch-Plattform." },
              { titel: "2. Gespeicherte Daten", text: "E-Mail-Adresse, Name, Telefonnummer, Vereinsname, Lizenzinformationen (Schiedsrichter), Spieldaten sowie technische Zugriffsdaten." },
              { titel: "3. Zweck", text: "Koordination von Freundschaftsspielen und Schiedsrichter-Einsätzen. Kontaktdaten sind für angemeldete Nutzer sichtbar." },
              { titel: "4. Rechtsgrundlage", text: "Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) und Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO)." },
              { titel: "5. Speicherdauer", text: "Bis zur Löschung des Kontos. Danach werden alle Daten innerhalb von 30 Tagen entfernt." },
              { titel: "6. Drittanbieter", text: "Supabase (Datenbankserver Frankfurt/EU, DSGVO-konform). Keine Weitergabe zu Werbezwecken." },
              { titel: "7. Deine Rechte", text: "Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerruf der Einwilligung." },
              { titel: "8. Cookies", text: "Nur technisch notwendige Session-Cookies. Keine Tracking- oder Werbe-Cookies." },
            ].map((a) => (
              <div key={a.titel} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a", marginBottom: 4 }}>{a.titel}</div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{a.text}</div>
              </div>
            ))}
            <button onClick={() => { setShowDatenschutz(false); setDatenschutz(true); }}
              style={{ width: "100%", padding: 12, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>
              Verstanden & Zustimmen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
