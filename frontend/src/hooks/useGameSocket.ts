import { useEffect, useRef, useState, useCallback } from "react";
import { ApiService } from "../services/apiService";

export interface GameState {
  state: "IDLE" | "SPINNING" | "RESULT";
  nextTransition: number;
  lastBall: number | null;
  serverTime?: number;
}

export function useGameSocket(enabled = false) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    // Clean up any existing connection before starting a new one
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
    }

    const url = ApiService.getWebSocketUrl("/api/ws/roulette");
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setRetryCount(0);
      console.log("[WS] Connected to RouletteTable pocketed on Edge");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "SYNC" || message.type === "STATE_CHANGE") {
          setGameState(message.payload);
        }
      } catch (e) {
        console.error("[WS] Failed to parse message", e);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);

      if (enabled) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
        console.warn(
          `[WS] Disconnected. Retrying in ${delay}ms... (Attempt ${retryCount + 1})`,
        );

        reconnectTimerRef.current = setTimeout(() => {
          setRetryCount((prev) => prev + 1);
        }, delay);
      }
    };

    ws.onerror = (e) => {
      console.error("[WS] WebSocket error:", e);
      ws.close();
    };

    wsRef.current = ws;
  }, [enabled, retryCount]);

  useEffect(() => {
    if (!enabled) {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
      setRetryCount(0);
      return;
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
    };
  }, [connect, enabled]);

  return { gameState, isConnected };
}
