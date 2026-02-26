import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface RevenueTickerProps {
  value: number;
  delta?: number;
  persona?: "executive" | "engineer";
  className?: string;
}

export const RevenueTicker: React.FC<RevenueTickerProps> = ({
  value,
  delta = 0,
  className,
}) => {
  const [prevValue, setPrevValue] = useState(value);
  const isIncrease = value >= prevValue;

  useEffect(() => {
    setPrevValue(value);
  }, [value]);

  return (
    <div className={cn("relative overflow-hidden font-mono", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={value}
          initial={{ y: isIncrease ? 24 : -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: isIncrease ? -24 : 24, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-2"
        >
          <span>
            £
            {value.toLocaleString("en-GB", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          {delta !== 0 && (
            <span
              className={cn(
                "text-sm",
                delta > 0 ? "text-accent-green" : "text-accent-pink",
              )}
            >
              {delta > 0 ? "+" : ""}
              {delta.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
