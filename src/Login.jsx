import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("login");
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
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError("Registrierung fehlgeschlagen: " + error.message);
    else setSuccess("Registrierung erfolgreich! Du kannst dich jetzt anmelden.");
    setLoading(false);
  }

  function handleSubmit() {
    if (!email || !password) { setError("Bitte E-Mail und Passwort eingeben."); return; }
    if (mode === "login") handleLogin();
    else handleRegister();
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5", padding: 16 }}>
      <div style={{ background: "white", border: "1px solid #e0e0e0", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 380, boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ width: 52, height: 52, background: "#1D9E75", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 12px" }}>⚽</div>
          <div style={{ fontSize: 22, fontWeight: 600, color: "#1a1a1a" }}>KickMatch</div>
          <div style={{ fontSize: 13, color: "#777", marginTop: 4 }}>Freundschaftsspiele koordinieren</div>
        </div>

        {/* Modus-Umschalter */}
        <div style={{ display: "flex", background: "#f0f2f5", borderRadius: 10, padding: 4, marginBottom: "1.25rem" }}>
          {[{ val: "login", label: "Anmelden" }, { val: "register", label: "Registrieren" }].map((btn) => (
            <button key={btn.val} onClick={() => { setMode(btn.val); setError(""); setSuccess(""); }}
              style={{ flex: 1, padding: "9px 0", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", background: mode === btn.val ? "white" : "transparent", color: mode === btn.val ? "#1a1a1a" : "#888", boxShadow: mode === btn.val ? "0 1px 4px rgba(0,0,0,0.1)" : "none", transition: "all .15s" }}>
              {btn.label}
            </button>
          ))}
        </div>

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

        {/* Datenschutz-Zustimmung — nur bei Registrierung */}
        {mode === "register" && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
              <input type="checkbox" checked={datenschutz} onChange={(e) => setDatenschutz(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, accentColor: "#1D9E75" }} />
              <span style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
                Ich habe die{" "}
                <span onClick={(e) => { e.preventDefault(); setShowDatenschutz(true); }}
                  style={{ color: "#185FA5", textDecoration: "underline", cursor: "pointer" }}>
                  Datenschutzerklärung
                </span>{" "}
                gelesen und stimme der Verarbeitung meiner Daten zu.
              </span>
            </label>
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading}
          style={{ width: "100%", padding: "12px 0", background: loading ? "#aaa" : "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer" }}>
          {loading ? "Bitte warten..." : mode === "login" ? "Anmelden" : "Konto erstellen"}
        </button>

        {/* Hinweis */}
        <div style={{ fontSize: 11, color: "#aaa", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
          Deine Daten werden ausschließlich für KickMatch verwendet und nicht an Dritte weitergegeben.
        </div>
      </div>

      {/* Datenschutz-Modal */}
      {showDatenschutz && (
        <div onClick={() => setShowDatenschutz(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", borderRadius: 16, padding: "1.5rem", maxWidth: 480, width: "100%", maxHeight: "80vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setShowDatenschutz(false)} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: "50%", border: "1px solid #e0e0e0", background: "#f5f5f5", cursor: "pointer", fontSize: 13, color: "#666" }}>✕</button>

            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, color: "#1a1a1a" }}>Datenschutzerklärung</div>

            {[
              {
                titel: "1. Verantwortlicher",
                text: "Verantwortlich für die Datenverarbeitung ist der Betreiber der KickMatch-Plattform. Bei Fragen zum Datenschutz wende dich bitte per E-Mail an den Betreiber."
              },
              {
                titel: "2. Welche Daten wir speichern",
                text: "Wir speichern folgende Daten: E-Mail-Adresse (für Login und Kommunikation), Name und Telefonnummer des Trainers (für Spielangebote und -anfragen), Vereinsname, Datum, Uhrzeit und Ort von Spielen sowie technische Zugriffsdaten (IP-Adresse, Browser)."
              },
              {
                titel: "3. Zweck der Datenverarbeitung",
                text: "Deine Daten werden ausschließlich zur Koordination von Freundschaftsspielen zwischen Fußballtrainern verwendet. Kontaktdaten (Name, Telefon) werden für andere angemeldete Trainer sichtbar, um die direkte Kontaktaufnahme zu ermöglichen."
              },
              {
                titel: "4. Rechtsgrundlage",
                text: "Die Datenverarbeitung erfolgt auf Grundlage deiner Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) sowie zur Erfüllung des Nutzungsvertrags (Art. 6 Abs. 1 lit. b DSGVO)."
              },
              {
                titel: "5. Speicherdauer",
                text: "Deine Daten werden gespeichert, solange du ein aktives Konto bei KickMatch hast. Nach Löschung deines Kontos werden alle personenbezogenen Daten innerhalb von 30 Tagen entfernt."
              },
              {
                titel: "6. Weitergabe an Dritte",
                text: "Deine Daten werden nicht an Dritte verkauft oder zu Werbezwecken weitergegeben. Wir nutzen Supabase als Datenbankdienstleister (Server in der EU/Frankfurt). Supabase ist nach DSGVO-Standards zertifiziert."
              },
              {
                titel: "7. Deine Rechte",
                text: "Du hast jederzeit das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung deiner gespeicherten Daten. Außerdem hast du das Recht auf Datenübertragbarkeit und das Recht, deine Einwilligung zu widerrufen."
              },
              {
                titel: "8. Cookies",
                text: "KickMatch verwendet ausschließlich technisch notwendige Cookies für die Anmeldung (Session-Cookie). Es werden keine Tracking- oder Werbe-Cookies eingesetzt."
              },
            ].map((abschnitt) => (
              <div key={abschnitt.titel} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 4 }}>{abschnitt.titel}</div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{abschnitt.text}</div>
              </div>
            ))}

            <button onClick={() => { setShowDatenschutz(false); setDatenschutz(true); }}
              style={{ width: "100%", padding: 12, background: "#1D9E75", color: "white", border: "none", borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: "pointer", marginTop: 8 }}>
              Verstanden & Zustimmen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
