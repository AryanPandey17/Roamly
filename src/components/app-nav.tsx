"use client";

import { Bookmark, Briefcase, Home, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/trips", label: "Trips", icon: Briefcase },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Main navigation. `rail` is the sidebar list on wide screens; `bar` is the
 * bottom tab bar on phones. The current section is marked with aria-current.
 */
export function AppNav({ variant }: { variant: "rail" | "bar" }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  if (variant === "bar") {
    return (
      <nav aria-label="Main" className="grid grid-cols-4">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              isActive(href) ? "text-foreground" : "text-muted"
            )}
          >
            <Icon className="size-5" aria-hidden fill={isActive(href) ? "currentColor" : "none"} fillOpacity={0.15} />
            {label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(href) ? "page" : undefined}
          className={cn(
            "flex items-center gap-4 rounded-xl px-3 py-3 text-[0.98rem] font-medium transition-colors",
            isActive(href) ? "bg-surface-2 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <Icon className="size-[22px]" aria-hidden fill={isActive(href) ? "currentColor" : "none"} fillOpacity={0.15} />
          {label}
        </Link>
      ))}
    </nav>
  );
}
