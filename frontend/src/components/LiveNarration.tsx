import React from "react";
import { motion } from "framer-motion";

export interface NarrationMessage {
  id: string;
  event: string;
  text: string;
  emoji: string;
  timestamp: Date;
}

export const LiveNarration: React.FC<{ messages: NarrationMessage[] }> = ({
  messages,
}) => {
  return (
    <div className="flex flex-col h-full bg-bg-secondary rounded-lg border border-glass-light overflow-hidden shadow-lg">
      <div className="px-5 py-3 border-b border-glass-light bg-bg-tertiary">
        <h2 className="text-xs font-bold text-text-primary uppercase tracking-widest text-accent-teal">
          Live Analysis
        </h2>
      </div>
      <div
        className="flex-1 overflow-y-auto p-5 space-y-5"
        role="log"
        aria-live="polite"
      >
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex gap-4 text-sm font-mono"
          >
            <span className="text-2xl flex-shrink-0" aria-hidden="true">
              {msg.emoji}
            </span>
            <div className="flex-1">
              <p className="text-text-primary leading-relaxed">{msg.text}</p>
              <p className="text-[10px] text-text-muted mt-1 uppercase tracking-wider">
                {msg.timestamp.toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </motion.div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-text-muted text-sm my-10 italic">
            Waiting for events...
          </div>
        )}
      </div>
    </div>
  );
};
