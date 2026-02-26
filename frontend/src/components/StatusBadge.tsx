import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type AppStatus =
  | "idle"
  | "authorizing"
  | "active_hold"
  | "confirming"
  | "error";

export const StatusBadge: React.FC<{
  status: AppStatus;
  className?: string;
}> = ({ status, className }) => {
  const statusColor = {
    idle: "bg-text-muted",
    authorizing: "bg-accent-yellow",
    active_hold: "bg-accent-teal",
    confirming: "bg-accent-orange",
    error: "bg-accent-pink",
  }[status];

  const statusLabel = {
    idle: "System Ready",
    authorizing: "Authorizing...",
    active_hold: "Hold Active",
    confirming: "Confirming Bet",
    error: "System Error",
  }[status];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full border border-glass-light bg-bg-secondary",
        className,
      )}
    >
      <motion.div
        animate={
          status !== "idle" && status !== "error"
            ? { opacity: [1, 0.5, 1] }
            : {}
        }
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className={cn("w-2 h-2 rounded-full", statusColor)}
        aria-hidden="true"
      />
      <span className="text-xs font-medium text-text-primary uppercase tracking-wider">
        {statusLabel}
      </span>
    </div>
  );
};
