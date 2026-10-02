import type { Metadata } from "next";
import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">Reset your password</h1>
      <p className="text-sm text-muted">Enter your email and we will send you a link to set a new password.</p>
      <ForgotForm />
      <p className="text-sm text-muted">
        <Link href="/login" className="underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
