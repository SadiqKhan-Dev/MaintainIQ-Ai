"use client";
import { useEffect, useRef, useState } from "react";
import { API_BASE } from "@/lib/api";

export interface RealtimeEvent {
  type: string;
  issue_number?: string;
  status?: string;
  asset?: string;
}

export function useRealtime(onEvent: (e: RealtimeEvent) => void) {
  const [connected, setConnected] = useState(false);
  const cb = useRef(onEvent);
  useEffect(() => {
    cb.current = onEvent;
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    const url = `${API_BASE.replace(/^http/, "ws")}/ws`;
    try {
      ws = new WebSocket(url);
    } catch {
      return;
    }
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        cb.current(JSON.parse(ev.data));
      } catch {
      }
    };
    return () => {
      closed = true;
      ws?.close();
      void closed;
    };
  }, []);

  return { connected };
}
