import type { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/server/auth";
import { UpdatePasswordForm } from "./update-form";

export const metadata: Metadata = { title: "Set a new password" };

export default async function UpdatePasswordPage() {
  // Reached through the reset link (which signs the user in) or from Settings.
  await requireUser();
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <Card className="space-y-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Set a new password</h1>
        <UpdatePasswordForm />
      </Card>
    </main>
  );
}
