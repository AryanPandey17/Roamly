import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <Link href="/" className="text-center text-xl font-semibold">
        Roamly
      </Link>
      <Card>{children}</Card>
    </main>
  );
}
