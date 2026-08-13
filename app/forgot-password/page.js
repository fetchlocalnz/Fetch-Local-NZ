"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <Wordmark />
          <div className="success-box">
            If an account exists for <strong>{email}</strong>, a password
            reset link has been sent. Check your inbox.
          </div>
          <a href="/login">
            <button className="btn-secondary" type="button">
              Back to log in
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <Wordmark />
        <form onSubmit={handleSubmit}>
          {error && <div className="error-box">{error}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <div className="switch-line">
          Remembered it? <a href="/login">Log in</a>
        </div>
      </div>
    </div>
  );
}
