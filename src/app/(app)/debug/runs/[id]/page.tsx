import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Run details" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Per-run observability: every LLM and tool call, in order. Owner only. */
export default async function RunDebugPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // Ownership check as the user (RLS); the log tables themselves are server-only.
  const supabase = await createClient();
  const { data: run } = await supabase.from("agent_runs").select("*").eq("id", id).maybeSingle();
  if (!run) notFound();

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const [llm, tools, quota] = await Promise.all([
    admin.from("llm_call_logs").select("*").eq("run_id", id).order("created_at"),
    admin.from("tool_call_logs").select("*").eq("run_id", id).order("created_at"),
    admin.from("provider_quota_usage").select("*").eq("day", today),
  ]);

  const th = "px-2 py-1 text-left font-medium text-muted";
  const td = "px-2 py-1 align-top";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Run details</h1>
        <p className="text-sm text-muted">
          Status {run.status} · {run.llm_calls} model calls · {run.tool_calls} tool calls · {run.rejections} rejections ·{" "}
          <Link href={`/trips/${run.trip_id}`} className="underline">
            Back to the trip
          </Link>
        </p>
      </div>

      <Card className="space-y-2">
        <h2 className="text-sm font-medium">Requests today (UTC)</h2>
        <p className="text-sm text-muted">
          {(quota.data ?? []).length === 0
            ? "None yet."
            : (quota.data ?? []).map((q) => `${q.provider}: ${q.requests} (${q.errors} failed)`).join(" · ")}
        </p>
      </Card>

      <Card className="space-y-2 overflow-x-auto">
        <h2 className="text-sm font-medium">Model calls</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["Agent", "Role", "Provider", "Served model", "Fallback", "Tokens in/out", "Latency", "Status"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(llm.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className={td}>{row.agent}</td>
                <td className={td}>{row.role}</td>
                <td className={td}>{row.provider}</td>
                <td className={td}>{row.served_model ?? `${row.requested_model} (requested)`}</td>
                <td className={td}>{row.fallback_depth}</td>
                <td className={td}>
                  {row.prompt_tokens ?? "–"} / {row.completion_tokens ?? "–"}
                </td>
                <td className={td}>{row.latency_ms} ms</td>
                <td className={td}>
                  {row.status}
                  {row.error_message ? <span className="block text-xs text-muted">{row.error_message}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-2 overflow-x-auto">
        <h2 className="text-sm font-medium">Tool calls</h2>
        <table className="w-full text-sm">
          <thead>
            <tr>
              {["Agent", "Tool", "Provider", "Latency", "Status"].map((h) => (
                <th key={h} className={th}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(tools.data ?? []).map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className={td}>{row.agent}</td>
                <td className={td}>{row.tool}</td>
                <td className={td}>{row.provider}</td>
                <td className={td}>{row.latency_ms} ms</td>
                <td className={td}>
                  {row.status}
                  {row.error_message ? <span className="block text-xs text-muted">{row.error_message}</span> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
