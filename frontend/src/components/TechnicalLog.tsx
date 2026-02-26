import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  requestId: string;
  event: string;
  duration: number;
  status: "success" | "error" | "pending";
}

export const TechnicalLog: React.FC<{
  logs: AuditLogEntry[];
  onClear?: () => void;
}> = ({ logs, onClear }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-bg-secondary rounded-lg border border-glass-light overflow-hidden shadow-lg font-mono text-xs">
      <div className="px-5 py-3 bg-bg-tertiary border-b border-glass-light flex justify-between items-center">
        <h2 className="font-bold text-text-primary uppercase tracking-widest text-accent-orange">
          Raw Audit Log
        </h2>
        {onClear && (
          <button
            onClick={onClear}
            className="text-text-muted hover:text-text-primary uppercase tracking-widest text-[10px] transition-colors"
          >
            Clear Logs
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-5" role="log" ref={containerRef}>
        <div className="space-y-1">
          <AnimatePresence>
            {logs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className={`flex gap-3 py-1 border-l-2 pl-3 ${
                  log.status === "success"
                    ? "border-accent-green text-accent-green"
                    : log.status === "error"
                      ? "border-accent-pink text-accent-pink"
                      : "border-accent-yellow text-accent-yellow"
                }`}
              >
                <span className="flex-shrink-0 w-[60px] opacity-75">
                  {log.timestamp.toLocaleTimeString([], { hour12: false })}
                </span>
                <span
                  className="flex-shrink-0 w-[70px] text-text-muted opacity-50 truncate"
                  title={log.requestId}
                >
                  {log.requestId.slice(0, 8)}…
                </span>
                <span className="flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
                  {log.event}
                </span>
                <span className="flex-shrink-0 w-12 text-right opacity-75">
                  {log.duration}ms
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          {logs.length === 0 && (
            <div className="text-center text-text-muted my-10 italic">
              Awaiting D1 events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
