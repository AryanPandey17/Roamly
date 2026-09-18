"use client"

import { useState } from "react"
import { ArrowRight, Compass, Mail } from "lucide-react"
import { useApp } from "@/context/AppContext"

export default function LoginPage() {
  const { setActivePage, signIn, signInWithGoogle, authError, supabaseEnabled } = useApp()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError("Please fill in all fields.")
      return
    }
    const ok = await signIn(email, password)
    if (!ok) setError(authError || "Could not log in.")
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="brand" onClick={() => setActivePage("landing")} style={{ padding: 0, marginBottom: "1.5rem" }}>
          <span className="brand-mark"><Compass /></span>
          <span>Roamly <small>AI TRIP STUDIO</small></span>
        </button>
        <h2>Welcome back</h2>
        <p>Log in to continue planning your trips.</p>

        {(error || authError) && <div className="auth-error">{error || authError}</div>}

        <form onSubmit={handleLogin}>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", fontSize: ".78rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: ".35rem", color: "#687186" }}>
              <input type="checkbox" /> Remember me
            </label>
            <button type="button" className="text-button" style={{ padding: 0 }} onClick={() => setActivePage("forgot-password")}>
              Forgot password?
            </button>
          </div>
          <button type="submit" className="primary-button" style={{ width: "100%" }}>
            Log in <ArrowRight />
          </button>
        </form>

        <div className="auth-divider">or</div>
        <button type="button" className="google-btn" onClick={() => void signInWithGoogle()}>
          <Mail /> Continue with Google
        </button>

        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: ".82rem", color: "#687186" }}>
          No account?{" "}
          <button className="text-button" style={{ padding: 0 }} onClick={() => setActivePage("signup")}>Sign up</button>
        </p>
        <p style={{ textAlign: "center", marginTop: ".75rem", fontSize: ".72rem", color: "#8892a4" }}>
          {supabaseEnabled ? "Uses your Supabase project for accounts." : "Supabase is not configured — demo login accepts any email and password."}
        </p>
      </div>
    </div>
  )
}
