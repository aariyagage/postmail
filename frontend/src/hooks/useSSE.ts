"use client";

import { useState, useCallback } from "react";
import { connectDigestStream } from "@/lib/sse";
import type { SSEStatus } from "@/types";

export function useSSE() {
  const [status, setStatus] = useState<SSEStatus>({ stage: "idle" });
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    const source = connectDigestStream(
      (event) => {
        if (event.event === "status") {
          try {
            setStatus(JSON.parse(event.data));
          } catch {
            // ignore parse errors
          }
        }
        setConnected(true);
      },
      () => {
        setConnected(false);
      }
    );

    return () => {
      source.close();
      setConnected(false);
    };
  }, []);

  return { status, connected, connect };
}
