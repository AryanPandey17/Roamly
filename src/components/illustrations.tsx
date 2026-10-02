import { Bookmark, Check, MapPin, Plane, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Small scenes drawn in code, used on gradient panels. Decorative only, so
// each one is hidden from assistive technology.

const paper = "rounded-xl bg-white text-[#14171f] shadow-[0_18px_36px_-16px_rgb(0_0_0/0.55)]";
const line = "h-1.5 rounded-full bg-[#14171f]/15";

/** Two overlapping itinerary cards. */
export function ItineraryArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-28 w-44", className)}>
      <div className={cn(paper, "absolute left-2 top-0 w-40 -rotate-3 p-3")}>
        <p className="text-[10px] font-bold">Itinerary</p>
        <div className={cn(line, "mt-2 w-24")} />
        <p className="mt-2 text-[9px] font-semibold text-[#666b78]">Day 1</p>
        <div className={cn(line, "mt-1.5 w-28")} />
      </div>
      <div className={cn(paper, "absolute bottom-0 right-0 flex w-36 rotate-3 items-center gap-2 p-2.5")}>
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[#ffede6] text-[#e4552f]">
          <MapPin className="size-3.5" />
        </span>
        <span className="flex-1 space-y-1.5">
          <span className={cn(line, "block w-full")} />
          <span className={cn(line, "block w-2/3")} />
        </span>
      </div>
    </div>
  );
}

/** A dotted flight path between two stops. */
export function RouteArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-28 w-48", className)}>
      <svg viewBox="0 0 192 112" className="absolute inset-0 size-full" fill="none">
        <path d="M22 86 C 60 10, 132 10, 170 60" stroke="#fff" strokeWidth="2.5" strokeDasharray="2 8" strokeLinecap="round" />
        <circle cx="22" cy="86" r="7" fill="#fff" />
        <circle cx="170" cy="60" r="7" fill="#ff6a45" stroke="#fff" strokeWidth="2.5" />
      </svg>
      <span className={cn(paper, "absolute left-[5.2rem] top-1 grid size-9 place-items-center rounded-full")}>
        <Plane className="size-4" />
      </span>
    </div>
  );
}

/** Two tilted place cards with pins. */
export function PlacesArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-28 w-40", className)}>
      {[
        { pos: "left-1 top-2 -rotate-6", tone: "bg-[#22283f]" },
        { pos: "right-1 top-0 rotate-6", tone: "bg-[#ff6a45]" },
      ].map((card) => (
        <div key={card.pos} className={cn(paper, "absolute w-[4.75rem] p-1.5", card.pos)}>
          <div className={cn("grid h-14 place-items-center rounded-lg text-white", card.tone)}>
            <MapPin className="size-5" />
          </div>
          <div className={cn(line, "mt-2 w-12")} />
          <div className={cn(line, "mb-1 mt-1.5 w-8")} />
        </div>
      ))}
    </div>
  );
}

/** A receipt with a total and a tick: the budget check. */
export function BudgetArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-28 w-24", className)}>
      <div
        className={cn(paper, "h-full rounded-b-none p-3")}
        style={{ clipPath: "polygon(0 0,100% 0,100% 100%,88% 93%,75% 100%,63% 93%,50% 100%,38% 93%,25% 100%,13% 93%,0 100%)" }}
      >
        <p className="text-[8px] font-bold tracking-widest text-[#666b78]">BUDGET</p>
        {[14, 10, 12].map((w, i) => (
          <div key={i} className="mt-2 flex justify-between">
            <span className={line} style={{ width: `${w * 3}px` }} />
            <span className={cn(line, "w-3")} />
          </div>
        ))}
        <div className="mt-2.5 flex items-center justify-between border-t border-dashed border-[#14171f]/25 pt-2">
          <span className="h-2 w-8 rounded-full bg-[#14171f]" />
          <span className="grid size-4 place-items-center rounded-full bg-[#17794f] text-white">
            <Check className="size-2.5" strokeWidth={3} />
          </span>
        </div>
      </div>
    </div>
  );
}

/** Chat bubbles: a proposal, a rejection, an approval. */
export function NegotiationArt({ className }: { className?: string }) {
  const rows = [
    { tone: "bg-[#2470bd]", width: "w-24", mark: null, shift: "" },
    { tone: "bg-[#b06d08]", width: "w-20", mark: "x", shift: "ml-6" },
    { tone: "bg-[#c2477f]", width: "w-24", mark: null, shift: "" },
    { tone: "bg-[#b06d08]", width: "w-16", mark: "ok", shift: "ml-6" },
  ] as const;
  return (
    <div aria-hidden className={cn("w-48 space-y-2", className)}>
      {rows.map((row, i) => (
        <div key={i} className={cn(paper, "flex w-fit items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3", row.shift)}>
          <span className={cn("size-5 rounded-full", row.tone)} />
          <span className={cn(line, row.width)} />
          {row.mark === "x" ? (
            <span className="grid size-4 place-items-center rounded-full bg-[#c23b2a] text-white">
              <X className="size-2.5" strokeWidth={3} />
            </span>
          ) : row.mark === "ok" ? (
            <span className="grid size-4 place-items-center rounded-full bg-[#17794f] text-white">
              <Check className="size-2.5" strokeWidth={3} />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** A stack of saved cards with a bookmark. */
export function SavedArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-28 w-36", className)}>
      <div className={cn(paper, "absolute left-5 top-0 h-20 w-28 rotate-6 opacity-70")} />
      <div className={cn(paper, "absolute left-2 top-3 w-28 -rotate-3 p-3")}>
        <div className="flex items-start justify-between">
          <span className="grid size-8 place-items-center rounded-lg bg-[#e4f0ec] text-[#14453f]">
            <Bookmark className="size-4" fill="currentColor" />
          </span>
          <span className={cn(line, "w-6")} />
        </div>
        <div className={cn(line, "mt-3 w-20")} />
        <div className={cn(line, "mt-1.5 w-12")} />
      </div>
    </div>
  );
}

/** Preference sliders. */
export function PreferencesArt({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn(paper, "w-40 space-y-3 p-3.5", className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-[#14171f] text-white">
        <SlidersHorizontal className="size-3.5" />
      </span>
      {[60, 30, 80].map((at) => (
        <div key={at} className="relative h-1.5 rounded-full bg-[#14171f]/12">
          <span className="absolute inset-y-0 left-0 rounded-full bg-[#14453f]" style={{ width: `${at}%` }} />
          <span
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#14453f] shadow"
            style={{ left: `${at}%` }}
          />
        </div>
      ))}
    </div>
  );
}

/** A plain "G" badge for the Google sign-in button. Swap in Google's official asset if you want their mark. */
export function GBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 place-items-center rounded-full border border-border bg-white text-[11px] font-bold leading-none text-[#14171f]",
        className
      )}
    >
      G
    </span>
  );
}
