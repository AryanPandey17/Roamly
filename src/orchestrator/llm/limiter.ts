/**
 * Token bucket shared by every agent and parallel branch that talks to one
 * provider. LangChain JS has no built-in rate limiter, so this is ours.
 * Callers wait their turn instead of being rejected.
 */
export class RateLimiter {
  private tokens: number;
  private last = Date.now();
  private queue: Promise<void> = Promise.resolve();

  constructor(private readonly perMinute: number) {
    // Start with a small burst so the two parallel proposals do not wait.
    this.tokens = Math.min(perMinute, 4);
  }

  acquire(): Promise<void> {
    const turn = this.queue.then(() => this.take());
    this.queue = turn.catch(() => undefined);
    return turn;
  }

  private async take() {
    const capacity = Math.min(this.perMinute, 4);
    const refillPerMs = this.perMinute / 60_000;
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(capacity, this.tokens + (now - this.last) * refillPerMs);
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.ceil((1 - this.tokens) / refillPerMs)));
    }
  }
}
