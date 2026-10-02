"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Catches unexpected errors on signed-in pages and offers a retry. */
export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-md space-y-4 py-10 text-center" role="alert">
      <p className="font-display text-2xl font-semibold">That did not load</p>
      <p className="text-sm text-muted">Something went wrong on our side. Your trips are safe.</p>
      <Button onClick={reset}>Try again</Button>
    </Card>
  );
}
