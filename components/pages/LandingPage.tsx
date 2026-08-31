"use client"

import { useApp } from "@/context/AppContext"
import { mockBudgetBreakdown, mockDayPlans } from "@/lib/mockData"

const agentRows = [
  {
    tag: "Supervisor agent",
    heading: "One agent runs the whole negotiation.",
    text: "Tell it where you're going, with who, and what you care about. It splits the work across the other three agents, settles their disagreements, and only shows you a plan once everyone's signed off.",
    photo: "rp-photo-agents",
  },
  {
    tag: "Logistics agent",
    heading: "Routes that actually hold together.",
    text: "Flights, transfers and the order you visit things in — checked for layovers, travel time and feasibility before anything gets suggested to you.",
    photo: "rp-photo-route",
  },
  {
    tag: "Recommendations agent",
    heading: "Stays and days out worth the money.",
    text: "Hotels picked for where you'll actually spend your time, restaurants and attractions that match what you told us, laid out day by day.",
    photo: "rp-photo-stay",
  },
  {
    tag: "Budget agent",
    heading: "Nothing ships until it fits.",
    text: "Every flight, room and activity is checked against what you set aside. Go over, and it pushes back with a cheaper option before you ever see the plan.",
    photo: "rp-photo-budget",
  },
]

const bento = [
  { title: "Budget negotiation, visible", text: "Watch the budget agent reject a hotel and the recommendations agent find one ₹26,000 cheaper two minutes later.", cta: "See a negotiation" },
  { title: "Day-by-day, not a list", text: "Times, places and costs laid out by day, ready to follow instead of twelve tabs to sort through yourself.", cta: "See a sample day" },
  { title: "Plan with your crew", text: "Share a trip, add preferences, and let the agents balance everyone's budget and pace at once.", cta: "Try it now" },
  { title: "Start from anywhere", text: "Drop in a rough idea, a screenshot, or just a city and dates — the agents fill in the rest.", cta: "Start planning" },
]

export default function LandingPage() {
  const { setActivePage, startDemo } = useApp()

  return (
    <div className="landing">
      <style>{`
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap");

.landing {
  --paper: #FFFFFF;
  --cream: #FBF9F5;
  --ink: #14171F;
  --ink-soft: #666B78;
  --line: #EAE7DF;
  --coral: #FF6A45;
  --coral-deep: #E4552F;
  --teal: #14453F;
  --teal-soft: #E4F0EC;

  --display: "Manrope", -apple-system, sans-serif;
  --sans: "Inter", -apple-system, sans-serif;

  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
}
.landing * { box-sizing: border-box; }
.landing a, .landing button { font-family: inherit; color: inherit; }

/* photo placeholders — swap these gradients for real destination photography */
.rp-photo {
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
}
.rp-photo::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.28) 100%);
}
.rp-photo-tokyo   { background-image: radial-gradient(120% 140% at 20% 0%, #FF9466 0%, #FF6A45 32%, #7A3B6E 70%, #241A3D 100%); }
.rp-photo-paris   { background-image: radial-gradient(120% 140% at 80% 0%, #FDD98B 0%, #F2A84C 30%, #6E7FA6 68%, #22283F 100%); }
.rp-photo-goa     { background-image: radial-gradient(120% 140% at 30% 10%, #8FE3D6 0%, #38B7A6 34%, #1E6E7A 66%, #0F2E3B 100%); }
.rp-photo-agents  { background-image: linear-gradient(135deg, #14453F 0%, #1E6E7A 55%, #38B7A6 100%); }
.rp-photo-route   { background-image: linear-gradient(135deg, #241A3D 0%, #7A3B6E 55%, #FF6A45 100%); }
.rp-photo-stay    { background-image: linear-gradient(135deg, #22283F 0%, #6E7FA6 55%, #FDD98B 100%); }
.rp-photo-budget  { background-image: linear-gradient(135deg, #0F2E3B 0%, #1E6E7A 55%, #8FE3D6 100%); }

/* ---------- Nav ---------- */
.rp-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.4rem clamp(1.25rem, 5vw, 3.5rem);
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
}
.rp-brand {
  background: none; border: none; cursor: pointer;
  font-family: var(--display);
  font-weight: 800;
  font-size: 1.35rem;
  letter-spacing: -0.02em;
}
.rp-nav-actions { display: flex; align-items: center; gap: 1.75rem; }
.rp-link { background: none; border: none; cursor: pointer; font-size: 0.94rem; font-weight: 500; color: var(--ink-soft); }
.rp-link:hover { color: var(--ink); }
.rp-pill {
  background: var(--ink);
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 0.7rem 1.4rem;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.rp-pill:hover { background: var(--coral-deep); }
.rp-pill.ghost {
  background: transparent;
  color: var(--ink);
  border: 1.5px solid var(--line);
}
.rp-pill.ghost:hover { border-color: var(--ink); background: var(--cream); }
.rp-pill:focus-visible, .rp-link:focus-visible, .rp-brand:focus-visible {
  outline: 2px solid var(--teal); outline-offset: 2px;
}

/* ---------- Hero ---------- */
.rp-hero {
  text-align: center;
  padding: clamp(3rem, 8vw, 5.5rem) clamp(1.25rem, 5vw, 3.5rem) 0;
  max-width: 860px;
  margin: 0 auto;
}
.rp-h1 {
  font-family: var(--display);
  font-weight: 800;
  font-size: clamp(2.6rem, 6vw, 4.4rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0 0 1.4rem;
}
.rp-hero p {
  font-size: 1.15rem;
  line-height: 1.6;
  color: var(--ink-soft);
  max-width: 34rem;
  margin: 0 auto 2rem;
}
.rp-hero-actions {
  display: flex;
  justify-content: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}
.rp-hero-actions .rp-pill { padding: 0.85rem 1.7rem; font-size: 1rem; }

/* full-bleed hero image w/ floating cards */
.rp-hero-visual {
  position: relative;
  max-width: 1320px;
  margin: 3rem auto 0;
  padding: 0 clamp(1.25rem, 5vw, 3.5rem);
}
.rp-hero-banner {
  height: clamp(260px, 40vw, 460px);
  border-radius: 28px;
}
.rp-hero-floats {
  position: absolute;
  left: 50%;
  bottom: -3.5rem;
  transform: translateX(-50%);
  display: flex;
  gap: 1.1rem;
  width: 100%;
  max-width: 640px;
  padding: 0 1rem;
  justify-content: center;
}
.rp-float-card {
  width: 168px;
  height: 118px;
  border-radius: 16px;
  box-shadow: 0 20px 40px -18px rgba(20, 23, 31, 0.4);
  border: 4px solid #fff;
  display: flex;
  align-items: flex-end;
  padding: 0.6rem 0.75rem;
  flex-shrink: 0;
}
.rp-float-card:first-child { transform: translateY(10px) rotate(-3deg); }
.rp-float-card:last-child { transform: translateY(10px) rotate(3deg); }
.rp-float-card span {
  color: #fff;
  font-weight: 700;
  font-size: 0.92rem;
  font-family: var(--display);
}

/* ---------- Section shell ---------- */
.rp-section {
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(6rem, 10vw, 8.5rem) clamp(1.25rem, 5vw, 3.5rem) clamp(3rem, 6vw, 4rem);
}
.rp-section-head {
  text-align: center;
  max-width: 34rem;
  margin: 0 auto clamp(3rem, 6vw, 4.5rem);
}
.rp-h2 {
  font-family: var(--display);
  font-weight: 800;
  font-size: clamp(1.8rem, 3.4vw, 2.4rem);
  letter-spacing: -0.02em;
  margin: 0 0 0.75rem;
}
.rp-section-head p { color: var(--ink-soft); font-size: 1.02rem; line-height: 1.6; margin: 0; }

/* ---------- Alternating agent rows ---------- */
.rp-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(2.5rem, 6vw, 5rem);
  align-items: center;
  padding: clamp(2.5rem, 5vw, 3.5rem) 0;
}
.rp-row:not(:last-child) { border-bottom: 1px solid var(--line); }
.rp-row.reverse .rp-row-media { order: 2; }
.rp-row-media {
  height: clamp(240px, 26vw, 340px);
  border-radius: 22px;
}
.rp-row-text .rp-tag {
  display: inline-block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--coral-deep);
  background: #FFEDE6;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  margin-bottom: 1rem;
}
.rp-row-text h3 {
  font-family: var(--display);
  font-weight: 800;
  font-size: clamp(1.5rem, 2.6vw, 1.95rem);
  letter-spacing: -0.02em;
  margin: 0 0 0.85rem;
  line-height: 1.15;
}
.rp-row-text p {
  color: var(--ink-soft);
  font-size: 1.02rem;
  line-height: 1.65;
  max-width: 30rem;
  margin: 0;
}

/* ---------- Bento grid ---------- */
.rp-bento {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.25rem;
}
.rp-bento-card {
  border: 1px solid var(--line);
  border-radius: 20px;
  overflow: hidden;
  background: var(--cream);
}
.rp-bento-media { height: 140px; }
.rp-bento-body { padding: 1.3rem 1.35rem 1.5rem; }
.rp-bento-body h4 {
  font-family: var(--display);
  font-weight: 700;
  font-size: 1.05rem;
  margin: 0 0 0.5rem;
}
.rp-bento-body p {
  font-size: 0.88rem;
  color: var(--ink-soft);
  line-height: 1.55;
  margin: 0 0 0.9rem;
}
.rp-bento-body a {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--teal);
  text-decoration: none;
}
.rp-bento-body a:hover { text-decoration: underline; }

/* ---------- Destination / inspiration row ---------- */
.rp-dest-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
.rp-dest-card {
  border-radius: 20px;
  overflow: hidden;
  background: var(--cream);
  border: 1px solid var(--line);
}
.rp-dest-media {
  height: 180px;
  display: flex;
  align-items: flex-end;
  padding: 1rem;
}
.rp-dest-media span {
  color: #fff;
  font-family: var(--display);
  font-weight: 700;
  font-size: 1.1rem;
}
.rp-dest-body { padding: 1.1rem 1.3rem 1.4rem; }
.rp-dest-body p { font-size: 0.9rem; color: var(--ink-soft); margin: 0 0 0.9rem; line-height: 1.55; }
.rp-budget-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.86rem;
  padding: 0.5rem 0;
  border-top: 1px solid var(--line);
}
.rp-budget-line strong { font-weight: 600; }

/* ---------- CTA band ---------- */
.rp-cta {
  background: var(--teal);
  border-radius: 28px;
  margin: 0 clamp(1.25rem, 5vw, 3.5rem) clamp(4rem, 7vw, 6rem);
  padding: clamp(3rem, 6vw, 4.5rem);
  text-align: center;
  color: #fff;
}
.rp-cta h2 {
  font-family: var(--display);
  font-weight: 800;
  font-size: clamp(1.8rem, 3.6vw, 2.5rem);
  letter-spacing: -0.02em;
  max-width: 30rem;
  margin: 0 auto 1.75rem;
}
.rp-cta .rp-pill { background: var(--coral); padding: 0.85rem 1.8rem; font-size: 1rem; }
.rp-cta .rp-pill:hover { background: #fff; color: var(--teal); }

/* ---------- Footer ---------- */
.rp-footer {
  border-top: 1px solid var(--line);
  padding: clamp(3rem, 6vw, 4rem) clamp(1.25rem, 5vw, 3.5rem) 2.5rem;
}
.rp-footer-cols {
  display: grid;
  grid-template-columns: 1.4fr repeat(3, 1fr);
  gap: 2rem;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid var(--line);
}
.rp-footer-brand {
  font-family: var(--display);
  font-weight: 800;
  font-size: 1.3rem;
}
.rp-footer-brand p { color: var(--ink-soft); font-size: 0.9rem; margin-top: 0.75rem; max-width: 16rem; line-height: 1.5; }
.rp-footer-col h5 { font-size: 0.85rem; font-weight: 600; margin: 0 0 1rem; }
.rp-footer-col { display: flex; flex-direction: column; gap: 0.65rem; }
.rp-footer-col button { background: none; border: none; text-align: left; cursor: pointer; font-size: 0.9rem; color: var(--ink-soft); padding: 0; }
.rp-footer-col button:hover { color: var(--ink); }
.rp-footer-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  font-size: 0.85rem;
  color: var(--ink-soft);
  flex-wrap: wrap;
  gap: 0.75rem;
}

/* ---------- Load-in (single moment, hero only) ---------- */
.rp-hero > * { opacity: 0; animation: rp-rise 0.7s ease forwards; }
.rp-hero .rp-h1 { animation-delay: 0.05s; }
.rp-hero p { animation-delay: 0.15s; }
.rp-hero .rp-hero-actions { animation-delay: 0.25s; }
.rp-hero-visual { opacity: 0; animation: rp-rise 0.8s ease 0.3s forwards; }
@keyframes rp-rise {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .rp-hero > *, .rp-hero-visual { animation: none !important; opacity: 1 !important; transform: none !important; }
}

/* ---------- Responsive ---------- */
@media (max-width: 980px) {
  .rp-row, .rp-row.reverse { grid-template-columns: 1fr; }
  .rp-row.reverse .rp-row-media { order: 0; }
  .rp-bento { grid-template-columns: repeat(2, 1fr); }
  .rp-dest-grid { grid-template-columns: 1fr; }
  .rp-footer-cols { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 640px) {
  .rp-nav-actions .rp-link { display: none; }
  .rp-bento { grid-template-columns: 1fr; }
  .rp-hero-floats { display: none; }
  .rp-footer-cols { grid-template-columns: 1fr; }
}

      `}</style>

      <nav className="rp-nav">
        <button className="rp-brand" onClick={() => setActivePage("landing")}>Roamly</button>
        <div className="rp-nav-actions">
          <button className="rp-link" onClick={() => setActivePage("about")}>Get inspired</button>
          <button className="rp-link" onClick={() => setActivePage("login")}>Log in</button>
          <button className="rp-pill" onClick={() => setActivePage("plan-trip")}>Start planning</button>
        </div>
      </nav>

      <main>
        <section className="rp-hero">
          <h1 className="rp-h1">Plan easier.<br />Travel further.</h1>
          <p>
            Four AI agents research your flights, stays and days out — then argue with each other
            until the plan fits your budget.
          </p>
          <div className="rp-hero-actions">
            <button className="rp-pill" onClick={() => setActivePage("plan-trip")}>Start planning</button>
            <button className="rp-pill ghost" onClick={startDemo}>Watch it work</button>
          </div>

          <div className="rp-hero-visual">
            <div className="rp-photo rp-photo-tokyo rp-hero-banner" />
            <div className="rp-hero-floats">
              <div className="rp-photo rp-photo-paris rp-float-card"><span>Paris</span></div>
              <div className="rp-photo rp-photo-goa rp-float-card"><span>Goa</span></div>
            </div>
          </div>
        </section>

        <section className="rp-section" style={{ paddingTop: "clamp(6.5rem, 10vw, 9rem)" }}>
          <div className="rp-section-head">
            <h2 className="rp-h2">How it works</h2>
            <p>Four specialists, each with a different priority, working on the same trip at once.</p>
          </div>
          {agentRows.map((row, i) => (
            <div className={`rp-row ${i % 2 ? "reverse" : ""}`} key={row.heading}>
              <div className={`rp-photo ${row.photo} rp-row-media`} />
              <div className="rp-row-text">
                <span className="rp-tag">{row.tag}</span>
                <h3>{row.heading}</h3>
                <p>{row.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rp-section">
          <div className="rp-section-head">
            <h2 className="rp-h2">New at Roamly</h2>
            <p>A few things the agents picked up recently.</p>
          </div>
          <div className="rp-bento">
            {bento.map((card, i) => (
              <div className="rp-bento-card" key={card.title}>
                <div className={`rp-photo rp-bento-media ${["rp-photo-budget", "rp-photo-route", "rp-photo-stay", "rp-photo-agents"][i]}`} />
                <div className="rp-bento-body">
                  <h4>{card.title}</h4>
                  <p>{card.text}</p>
                  <a onClick={startDemo}>{card.cta}</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rp-section">
          <div className="rp-section-head">
            <h2 className="rp-h2">Get inspired</h2>
            <p>A trip the agents already put together, and a couple more to browse.</p>
          </div>
          <div className="rp-dest-grid">
            <div className="rp-dest-card">
              <div className="rp-photo rp-photo-tokyo rp-dest-media"><span>Mumbai → Tokyo</span></div>
              <div className="rp-dest-body">
                <p>5 days · 2 travelers · ₹2,00,000 budget</p>
                {mockBudgetBreakdown.slice(0, 3).map((item) => (
                  <div className="rp-budget-line" key={item.category}>
                    <span>{item.category}</span>
                    <strong>₹{item.amount.toLocaleString("en-IN")}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="rp-dest-card">
              <div className="rp-photo rp-photo-paris rp-dest-media"><span>Paris</span></div>
              <div className="rp-dest-body">
                <p>{mockDayPlans[0]?.theme ?? "A slower week in the city"}</p>
                <div className="rp-budget-line"><span>Suggested budget</span><strong>₹3,50,000</strong></div>
              </div>
            </div>
            <div className="rp-dest-card">
              <div className="rp-photo rp-photo-goa rp-dest-media"><span>Goa</span></div>
              <div className="rp-dest-body">
                <p>A short coastal break, built around the agents' pace preference of "relaxed."</p>
                <div className="rp-budget-line"><span>Suggested budget</span><strong>₹45,000</strong></div>
              </div>
            </div>
          </div>
        </section>

        <div className="rp-cta">
          <h2>See what four agents can put together for your next trip.</h2>
          <button className="rp-pill" onClick={() => setActivePage("plan-trip")}>Start planning</button>
        </div>
      </main>

      <footer className="rp-footer">
        <div className="rp-footer-cols">
          <div className="rp-footer-brand">
            Roamly
            <p>Multi-agent AI trip planning — routes, stays, experiences and budget, negotiated for you.</p>
          </div>
          <div className="rp-footer-col">
            <h5>For travelers</h5>
            <button onClick={() => setActivePage("plan-trip")}>Plan a trip</button>
            <button onClick={() => setActivePage("dashboard")}>Dashboard</button>
            <button onClick={() => setActivePage("about")}>Get inspired</button>
          </div>
          <div className="rp-footer-col">
            <h5>Product</h5>
            <button onClick={() => setActivePage("architecture")}>Architecture</button>
            <button onClick={startDemo}>Demo mode</button>
          </div>
          <div className="rp-footer-col">
            <h5>Company</h5>
            <button onClick={() => setActivePage("about")}>About</button>
          </div>
        </div>
        <div className="rp-footer-bottom">
          <span>© 2026 Roamly</span>
          <span>Multi-agent AI trip planner</span>
        </div>
      </footer>
    </div>
  )
}