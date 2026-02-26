import React, { useState, useEffect } from "react";
import { Mic, MicOff, WifiOff } from "lucide-react";
import { motion } from "framer-motion";
import {
  useRealtimeKitClient,
  useRealtimeKitSelector,
  RealtimeKitProvider,
} from "@cloudflare/realtimekit-react";
import type RTKClient from "@cloudflare/realtimekit";
import { ApiService } from "@/services/apiService";

// Colour wheel for participant avatars
const AVATAR_COLOURS = [
  "bg-accent-teal",
  "bg-accent-orange",
  "bg-accent-pink",
  "bg-purple-400",
  "bg-blue-400",
];

// ------------------------------------------------------------
// OUTER: Manages RTK lifecycle. Mute button ALWAYS visible.
// ------------------------------------------------------------
export const LiveTableAudio: React.FC<{
  isMuted: boolean;
  onToggleMute: () => void;
}> = ({ isMuted, onToggleMute }) => {
  const [rtkStatus, setRtkStatus] = useState<"loading" | "live" | "error">(
    "loading",
  );
  const [client, initClient] = useRealtimeKitClient();

  useEffect(() => {
    ApiService.getAudioToken()
      .then((res) => {
        if (res.success && res.data) {
          return initClient({
            authToken: res.data.token,
            defaults: { audio: !isMuted, video: false },
          });
        }
        throw new Error("Token negotiation failed");
      })
      .then(() => setRtkStatus("live"))
      .catch((err) => {
        console.warn("[Audio] negotiation failed:", err);
        setRtkStatus("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-3 bg-glass-medium border border-glass-light rounded-[24px] px-3 py-2 sm:px-4 w-full overflow-hidden">
      {/* LEFT: live participant list OR status badge */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        {/* Status dot */}
        <div className="flex flex-col leading-none border-r border-glass-light pr-3 shrink-0">
          <span className="text-[10px] font-black text-accent-teal uppercase tracking-tighter">
            Live
          </span>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            {rtkStatus === "loading"
              ? "…"
              : rtkStatus === "error"
                ? "Offline"
                : "Table"}
          </span>
        </div>

        {/* Participant avatars (inside RTK context) */}
        {rtkStatus === "live" && client ? (
          <RealtimeKitProvider value={client as RTKClient | undefined}>
            <ParticipantAvatars isMuted={isMuted} />
          </RealtimeKitProvider>
        ) : rtkStatus === "loading" ? (
          <span className="text-[10px] text-accent-teal animate-pulse font-bold uppercase tracking-widest">
            Broker WebRTC…
          </span>
        ) : (
          <div className="flex items-center gap-1.5">
            <WifiOff className="w-3 h-3 text-accent-pink" />
            <span className="text-[10px] text-accent-pink font-bold uppercase tracking-widest">
              Audio unavailable
            </span>
          </div>
        )}
      </div>

      {/* RIGHT: Mute button — ALWAYS rendered */}
      <button
        id="audio-mute-toggle"
        onClick={onToggleMute}
        className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 sm:px-4 rounded-full font-black text-xs uppercase tracking-widest transition-all ${
          isMuted
            ? "bg-bg-primary text-text-muted hover:bg-glass-light border border-white/5"
            : "bg-accent-teal text-black shadow-[0_0_15px_rgba(0,230,204,0.4)] hover:scale-105"
        }`}
      >
        {isMuted ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4 animate-pulse" />
        )}
        <span className="hidden sm:inline">
          {isMuted ? "Unmute" : "On Air"}
        </span>
      </button>
    </div>
  );
};

// ------------------------------------------------------------
// INNER: reads live participant data. Must be inside Provider.
// ------------------------------------------------------------
const ParticipantAvatars: React.FC<{ isMuted: boolean }> = ({ isMuted }) => {
  const allParticipants = useRealtimeKitSelector((c) => c.participants.joined);
  const self = useRealtimeKitSelector((c) => c.self);

  const participantList = [
    ...(self ? [{ id: self.id, name: "You", isSelf: true }] : []),
    ...Array.from(allParticipants.values()).map((p) => ({
      id: p.id,
      name: p.name ?? "Player",
      isSelf: false,
    })),
  ].slice(0, 4); // max 4 avatars before the mute button

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {participantList.map((p, idx) => (
        <div key={p.id} className="flex items-center gap-1.5">
          <motion.div
            animate={{
              boxShadow:
                !isMuted && p.isSelf
                  ? `0 0 12px rgba(0,230,204,0.6)`
                  : "0 0 0px rgba(0,0,0,0)",
              scale: !isMuted && p.isSelf ? 1.12 : 1,
            }}
            transition={{ duration: 0.3 }}
            className={`w-7 h-7 rounded-full ${AVATAR_COLOURS[idx % AVATAR_COLOURS.length]} flex-shrink-0 flex items-center justify-center border border-white/30 text-black font-black text-xs shadow-inner`}
          >
            {(p.name ?? "?").charAt(0).toUpperCase()}
          </motion.div>
          <span
            className={`text-xs font-bold whitespace-nowrap hidden md:block ${
              !isMuted && p.isSelf ? "text-accent-teal" : "text-text-primary"
            }`}
          >
            {p.name}
          </span>
        </div>
      ))}
      {participantList.length === 0 && (
        <span className="text-xs text-text-muted italic">No peers…</span>
      )}
    </div>
  );
};
