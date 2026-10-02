import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-foreground text-background hover:bg-accent-deep hover:text-white",
  secondary: "border-[1.5px] border-border bg-transparent text-foreground hover:border-foreground hover:bg-surface-2",
  ghost: "text-muted hover:bg-surface-2 hover:text-foreground",
  danger: "border border-danger/40 text-danger hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export const buttonClass = (variant: Variant = "primary", className?: string, size: Size = "md") =>
  cn(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    variants[variant],
    sizes[size],
    className
  );

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, className, size)} {...props} />;
}
