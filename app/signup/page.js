"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password needs to be at least 6 characters.");
      return;
    }

    setLoading(true);
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    // If email confirmation is on (default for a new Supabase project),
    // there's no session yet — the person needs to check their inbox first.
    if (data.session) {
      router.push("/onboarding");
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <Wordmark />
          <div className="success-box">
            Almost there — we've sent a confirmation link to <strong>{email}</strong>.
            Open it, then come back and log in.
          </div>
          <a href="/login">
            <button className="btn-secondary" type="button">
              Go to log in
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
        <form onSubmit={handleSignup}>
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
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <div className="switch-line">
          Already have an account? <a href="/login">Log in</a>
        </div>
      </div>
    </div>
  );
}
