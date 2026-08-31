"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, CheckCircle, Compass, Mail } from "lucide-react"
import { useApp } from "@/context/AppContext"

export default function ForgotPasswordPage() {
  const { setActivePage } = useApp()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="brand" onClick={() => setActivePage("landing")} style={{ padding: 0, marginBottom: "1.5rem" }}>
          <span className="brand-mark"><Compass /></span>
          <span>Roamly <small>AI TRIP STUDIO</small></span>
        </button>

        {!sent ? (
          <>
            <h2>Reset password</h2>
            <p>We&apos;ll send reset instructions to your email.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (email) setSent(true) }}>
              <div className="auth-field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <button type="submit" className="primary-button" style={{ width: "100%" }}>
                Send reset link <ArrowRight />
              </button>
            </form>
            <button className="secondary-button" style={{ width: "100%", marginTop: ".75rem" }} onClick={() => setActivePage("login")}>
              <ArrowLeft /> Back to login
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center" }}>
            <CheckCircle style={{ width: "2.5rem", height: "2.5rem", color: "#149d87", margin: "0 auto 1rem" }} />
            <h2>Check your email</h2>
            <p>Reset instructions sent to <strong>{email}</strong></p>
            <button className="primary-button" style={{ marginTop: "1.25rem" }} onClick={() => setActivePage("login")}>
              Back to login
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
