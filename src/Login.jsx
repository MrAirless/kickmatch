import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" oder "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError("Login fehlgeschlagen. E-Mail oder Passwort falsch.");
    }
    // Bei Erfolg: Supabase aktualisiert die Session automatisch
    // App.jsx erkennt das und zeigt die App statt des Login-Formulars

    setLoading(false);
  }

  async function handleRegister() {
    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen lang sein.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError("Registrierung fehlgeschlagen: " + error.message);
    } else {
      setSuccess(
        "Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse und melde dich dann an."
      );
    }

    setLoading(false);
  }

  function handleSubmit() {
    if (!email || !password) {
      setError("Bitte E-Mail und Passwort eingeben.");
      return;
    }
    if (mode === "login") {
      handleLogin();
    } else {
      handleRegister();
    }
  }

  // Eingabe mit Enter bestätigen
  function handleKeyDown(e) {
    if (e.key === "Enter") handleSubmit();
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    border: "0.5px solid #ccc",
    borderRadius: 8,
    fontSize: 15,
    outline: "none",
    marginTop: 4,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f9f9f7",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "white",
          border: "0.5px solid #e5e5e5",
          borderRadius: 16,
          padding: "2rem",
          width: "100%",
          maxWidth: 380,
        }}
      >
        {/* Logo & Titel */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: "#1D9E75",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              margin: "0 auto 12px",
            }}
          >
            ⚽
          </div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>KickMatch</div>
          <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>
            {mode === "login" ? "Anmelden" : "Neues Konto erstellen"}
          </div>
        </div>

        {/* Modus-Umschalter */}
        <div
          style={{
            display: "flex",
            background: "#f5f5f5",
            borderRadius: 10,
            padding: 4,
            marginBottom: "1.25rem",
          }}
        >
          {[
            { val: "login", label: "Anmelden" },
            { val: "register", label: "Registrieren" },
          ].map((btn) => (
            <button
              key={btn.val}
              onClick={() => {
                setMode(btn.val);
                setError("");
                setSuccess("");
              }}
              style={{
                flex: 1,
                padding: "8px 0",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                background: mode === btn.val ? "white" : "transparent",
                color: mode === btn.val ? "#1a1a1a" : "#888",
                boxShadow:
                  mode === btn.val ? "0 0 0 0.5px #e0e0e0" : "none",
                transition: "all .15s",
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Fehlermeldung */}
        {error && (
          <div
            style={{
              background: "#FCEBEB",
              border: "0.5px solid #F09595",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              color: "#791F1F",
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {/* Erfolgsmeldung */}
        {success && (
          <div
            style={{
              background: "#EAF3DE",
              border: "0.5px solid #C0DD97",
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              color: "#27500A",
              marginBottom: 14,
            }}
          >
            {success}
          </div>
        )}

        {/* Formular */}
        <div style={{ marginBottom: 12 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#666",
              marginBottom: 2,
            }}
          >
            E-Mail-Adresse
          </label>
          <input
            type="email"
            placeholder="trainer@beispiel.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            style={inputStyle}
            autoComplete="email"
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 500,
              color: "#666",
              marginBottom: 2,
            }}
          >
            Passwort
          </label>
          <input
            type="password"
            placeholder={
              mode === "register"
                ? "Mindestens 6 Zeichen"
                : "Dein Passwort"
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            style={inputStyle}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
        </div>

        {/* Submit-Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: "100%",
            padding: "12px 0",
            background: loading ? "#aaa" : "#1D9E75",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 500,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "opacity .15s",
          }}
        >
          {loading
            ? "Bitte warten..."
            : mode === "login"
            ? "Anmelden"
            : "Konto erstellen"}
        </button>

        {/* Hinweis Datenschutz */}
        {mode === "register" && (
          <div
            style={{
              fontSize: 11,
              color: "#aaa",
              textAlign: "center",
              marginTop: 12,
              lineHeight: 1.5,
            }}
          >
            Mit der Registrierung stimmst du der Nutzung deiner
            Daten ausschließlich für KickMatch zu.
          </div>
        )}
      </div>
    </div>
  );
}
