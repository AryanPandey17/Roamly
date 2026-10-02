"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Preference = "light" | "dark" | "system";
const KEY = "roamly-theme";

/**
 * Runs before first paint (inlined in <head>): reads the stored preference,
 * resolves "system" against the OS setting, and sets <html data-theme>.
 * This is what prevents a flash of the wrong theme on load.
 */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}})();`;

function apply(preference: Preference) {
  const dark =
    preference === "dark" || (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

const OPTIONS: { value: Preference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Three-way theme switch. The choice is stored in this browser. */
export function ThemeToggle({ className }: { className?: string }) {
  // Unknown until mounted, so the server and the first client render agree.
  const [preference, setPreference] = useState<Preference | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser storage after mount
    setPreference((localStorage.getItem(KEY) as Preference | null) ?? "system");
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  function choose(value: Preference) {
    localStorage.setItem(KEY, value);
    setPreference(value);
    apply(value);
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className={cn("inline-flex rounded-full border border-border bg-surface p-0.5", className)}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={preference === value}
          aria-label={label}
          title={label}
          onClick={() => choose(value)}
          className={cn(
            "grid size-7 place-items-center rounded-full text-muted transition hover:text-foreground",
            preference === value && "bg-surface-2 text-foreground"
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </button>
      ))}
    </div>
  );
}
