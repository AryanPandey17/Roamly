import type { Metadata } from "next";
import Link from "next/link";
import { Divider, GoogleButton } from "../google-button";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Create your account</h1>
      <SignupForm />
      <Divider />
      <GoogleButton next="/onboarding" />
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
