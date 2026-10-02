import { Compass, Gavel, PiggyBank, Plane, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const AGENTS = {
  supervisor: { name: "Supervisor", role: "The Executive", icon: Gavel, bg: "bg-agent-supervisor", text: "text-agent-supervisor" },
  logistics: { name: "Logistics", role: "The Realist", icon: Plane, bg: "bg-agent-logistics", text: "text-agent-logistics" },
  recommendations: { name: "Recommendations", role: "The Dreamer", icon: Sparkles, bg: "bg-agent-recommendations", text: "text-agent-recommendations" },
  budget: { name: "Budget", role: "The Skeptic", icon: PiggyBank, bg: "bg-agent-budget", text: "text-agent-budget" },
  system: { name: "System", role: "", icon: Compass, bg: "bg-muted", text: "text-muted" },
} as const;

export type AgentId = keyof typeof AGENTS;
export const agentOf = (id: string) => AGENTS[(id in AGENTS ? id : "system") as AgentId];

export function AgentAvatar({ agent, size = "md", pulse = false }: { agent: string; size?: "sm" | "md"; pulse?: boolean }) {
  const a = agentOf(agent);
  const Icon = a.icon;
  return (
    <span className="relative inline-grid shrink-0">
      {pulse ? <span aria-hidden className={cn("absolute inset-0 animate-ping rounded-full opacity-40", a.bg)} /> : null}
      <span
        aria-hidden
        className={cn(
          "relative grid place-items-center rounded-full text-white",
          a.bg,
          size === "sm" ? "size-6" : "size-8"
        )}
      >
        <Icon className={size === "sm" ? "size-3.5" : "size-4"} />
      </span>
    </span>
  );
}
