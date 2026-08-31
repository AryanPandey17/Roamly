"use client"

import Sidebar from "@/components/Sidebar"

export default function AppLayout({
  children,
  maxWidth = "max-w-6xl",
}: {
  children: React.ReactNode
  maxWidth?: string
}) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className={`page-wrap ${maxWidth}`}>{children}</div>
      </main>
    </div>
  )
}
