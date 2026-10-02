import "server-only";

export type SseSend = (data: unknown, id?: number) => void;

/**
 * A Server-Sent Events response. `run` receives a `send` function and may
 * take as long as it needs; the stream closes when it returns. If the browser
 * disconnects, `send` becomes a no-op and `run` keeps going, so server-side
 * work is never cut short by a closed tab.
 */
export function sseResponse(run: (send: SseSend) => Promise<void>): Response {
  const encoder = new TextEncoder();
  let open = true;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          open = false;
        }
      };
      const send: SseSend = (data, id) => write(`${id !== undefined ? `id: ${id}\n` : ""}data: ${JSON.stringify(data)}\n\n`);

      // Comment lines keep proxies and browsers from timing the connection out.
      const heartbeat = setInterval(() => write(": keep-alive\n\n"), 15_000);
      try {
        await run(send);
      } catch (error) {
        console.error(JSON.stringify({ level: "error", where: "sse", message: String(error) }));
        send({ type: "error", code: "stream_failed", message: "The live connection failed. Reload to continue." });
      } finally {
        clearInterval(heartbeat);
        if (open) {
          open = false;
          try {
            controller.close();
          } catch {
            // already closed by the client
          }
        }
      }
    },
    cancel() {
      open = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
