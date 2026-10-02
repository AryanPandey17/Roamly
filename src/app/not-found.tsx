import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-5 px-4 text-center">
      <Logo />
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Nothing here</h1>
      <p className="text-muted">That page does not exist, or it is not yours to see.</p>
      <Link href="/" className={buttonClass()}>
        Back to the start
      </Link>
    </main>
  );
}
