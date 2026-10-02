import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "warning" | "primary";

const tones: Record<Tone, string> = {
  neutral: "border-border text-muted",
  success: "border-success/40 bg-success/10 text-success",
  danger: "border-danger/40 bg-danger/10 text-danger",
  warning: "border-warning/40 bg-warning/10 text-warning",
  primary: "border-primary/40 bg-primary/10 text-primary",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}
      {...props}
    />
  );
}
