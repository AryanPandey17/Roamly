"use client";

import { BedDouble, ExternalLink, MapPin, Plane, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { money } from "@/components/trip/format";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database";

const KIND = {
  flight: { label: "Flights", icon: Plane },
  stay: { label: "Stays", icon: BedDouble },
  place: { label: "Places", icon: MapPin },
} as const;

type Payload = { description?: string | null; cost?: number; currency?: string; deepLink?: string | null };

export function SavedList({ saved }: { saved: Tables<"saved_options">[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function remove(id: string) {
    const response = await fetch(`/api/saved/${id}`, { method: "DELETE" });
    if (response.ok) startTransition(() => router.refresh());
  }

  return (
    <div className={cn("space-y-8", pending && "opacity-70")}>
      {(Object.keys(KIND) as (keyof typeof KIND)[]).map((kind) => {
        const group = saved.filter((s) => s.kind === kind);
        if (group.length === 0) return null;
        const { label, icon: Icon } = KIND[kind];
        return (
          <section key={kind} className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-medium text-muted">
              <Icon className="size-4" aria-hidden /> {label}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {group.map((item) => {
                const payload = (item.payload ?? {}) as Payload;
                return (
                  <li key={item.id}>
                    <Card className="flex h-full items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="font-medium">{item.title}</p>
                        {payload.description ? <p className="text-sm text-muted">{payload.description}</p> : null}
                        <p className="flex flex-wrap items-center gap-3 text-sm">
                          {payload.cost && payload.currency ? (
                            <span className="tabular-nums">{money(payload.cost, payload.currency)}</span>
                          ) : null}
                          {payload.deepLink ? (
                            <a
                              href={payload.deepLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Open <ExternalLink className="size-3" aria-hidden />
                            </a>
                          ) : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void remove(item.id)}
                        aria-label={`Remove ${item.title} from saved`}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
