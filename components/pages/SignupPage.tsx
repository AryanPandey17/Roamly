"use client"

import { useState } from "react"
import { ArrowRight, Compass, Mail, User } from "lucide-react"
import { useApp } from "@/context/AppContext"

export default function SignupPage() {
  const { setActivePage, setUser } = useApp()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !password || !confirm) {
      setError("Please fill in all fields.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    setUser({ name, email, avatar: "" })
    setActivePage("dashboard")
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="brand" onClick={() => setActivePage("landing")} style={{ padding: 0, marginBottom: "1.5rem" }}>
          <span className="brand-mark"><Compass /></span>
          <span>Roamly <small>AI TRIP STUDIO</small></span>
        </button>
        <h2>Create your account</h2>
        <p>Start planning smarter trips with AI agents.</p>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSignup}>
          <div className="auth-field">
            <label htmlFor="name">Full name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <div className="auth-field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" />
          </div>
          <button type="submit" className="primary-button" style={{ width: "100%" }}>
            Create account <ArrowRight />
          </button>
        </form>
        <div className="auth-divider">or</div>
        <button type="button" className="google-btn"><User /> Continue with Google</button>
        <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: ".82rem", color: "#687186" }}>
          Already have an account?{" "}
          <button className="text-button" style={{ padding: 0 }} onClick={() => setActivePage("login")}>Log in</button>
        </p>
      </div>
    </div>
  )
}
