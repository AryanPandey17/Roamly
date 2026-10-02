import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[20px] border border-border bg-surface p-5 sm:p-6", className)} {...props} />;
}
