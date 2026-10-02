import type { Metadata } from "next";
import Link from "next/link";
import { Divider, GoogleButton } from "../google-button";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Log in</h1>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <LoginForm next={next} />
      <Divider />
      <GoogleButton next={next} />
      <p className="flex justify-between text-sm text-muted">
        <Link href="/forgot-password" className="underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
