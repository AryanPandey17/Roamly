"use client";

import dynamic from "next/dynamic";

// three.js is only downloaded when the landing page renders in a browser.
const Globe = dynamic(() => import("./globe"), { ssr: false });

export function GlobeSlot() {
  return <Globe />;
}
