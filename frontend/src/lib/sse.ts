import { createClient } from "@/lib/supabase/client";

export interface SSEEvent {
  event: string;
  data: string;
}

// SSE must connect directly to the backend — Next.js rewrites buffer
// streaming responses, which breaks Server-Sent Events.
const SSE_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function connectDigestStream(
  onEvent: (event: SSEEvent) => void,
  onError?: (error: Event) => void
): { close: () => void } {
  const supabase = createClient();
  let eventSource: EventSource | null = null;
  let closed = false;

  supabase.auth.getSession().then(({ data }) => {
    if (closed) return;

    const params = new URLSearchParams();
    if (data.session?.access_token) {
      params.set("access_token", data.session.access_token);
    }

    const url = `${SSE_BASE_URL}/api/stream/digest${params.toString() ? `?${params.toString()}` : ""}`;
    eventSource = new EventSource(url);

    eventSource.addEventListener("status", (e) => {
      onEvent({ event: "status", data: e.data });
    });

    eventSource.addEventListener("heartbeat", (e) => {
      onEvent({ event: "heartbeat", data: e.data });
    });

    eventSource.onerror = (e) => {
      onError?.(e);
    };
  });

  return {
    close() {
      closed = true;
      eventSource?.close();
    },
  };
}
