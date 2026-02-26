import React from "react";
import { DollarSign, TrendingUp, Cpu, Network } from "lucide-react";
import { motion } from "framer-motion";

interface CostComparisonProps {
  eventCount: number;
}

export const CostComparison: React.FC<CostComparisonProps> = ({
  eventCount,
}) => {
  // Approximate cost per 1M operations (Simplified for demo)
  // Cloudflare: £0.15/1M (Workers CPU time) + £0 Base
  // Legacy: £1.20/1M (Compute) + £0.09/GB (Egress) + Managed Cache nodes

  const cfUnitPrice = 0.00000015;
  const legacyUnitPrice = 0.0000085; // Includes egress + compute overhead

  const cfCost = 0.01 + eventCount * cfUnitPrice;
  const legacyCost = 0.45 + eventCount * legacyUnitPrice;

  return (
    <div className="bg-bg-tertiary border border-glass-medium rounded-xl p-4 shadow-xl flex flex-col gap-4">
      <div className="flex justify-between items-center border-b border-glass-light pb-2">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-accent-green" />
          Live Infrastructure Cost
        </h3>
        <div className="text-[10px] text-accent-pink font-mono animate-pulse">
          REAL-TIME CALC
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Cloudflare Row */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-accent-orange/10 flex items-center justify-center border border-accent-orange/20">
              <Cpu className="w-4 h-4 text-accent-orange" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Cloudflare</div>
              <div className="text-[10px] text-text-muted">
                Durable Objects + Workers
              </div>
            </div>
          </div>
          <motion.div
            key={cfCost}
            initial={{ scale: 1.1, color: "#4ade80" }}
            animate={{ scale: 1, color: "#fff" }}
            className="text-lg font-mono font-bold"
          >
            £{cfCost.toFixed(4)}
          </motion.div>
        </div>

        {/* Legacy Row */}
        <div className="flex items-center justify-between opacity-80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Network className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Legacy (AWS)</div>
              <div className="text-[10px] text-text-muted">
                EC2 + ElastiCache + Egress
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <motion.div
              key={legacyCost}
              initial={{ scale: 1.1, color: "#ef4444" }}
              animate={{ scale: 1, color: "#ef4444" }}
              className="text-lg font-mono font-bold"
            >
              £{legacyCost.toFixed(4)}
            </motion.div>
            <div className="text-[9px] text-red-400 flex items-center gap-1 uppercase font-black">
              <TrendingUp className="w-2 h-2" />{" "}
              {((legacyCost / (cfCost || 1)) * 100).toFixed(0)}% more expensive
            </div>
          </div>
        </div>
      </div>

      <div className="bg-black/40 rounded-lg p-3 border border-white/5">
        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-text-muted mb-1">
          <span>Simulation Scale</span>
          <span>{eventCount.toLocaleString()} Events</span>
        </div>
        <div className="w-full bg-glass-medium h-1.5 rounded-full overflow-hidden">
          <motion.div
            className="bg-accent-teal h-full"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min((eventCount / 1000) * 100, 100)}%` }}
          />
        </div>
      </div>

      <p className="text-[9px] text-text-muted italic leading-tight">
        * Estimated based on 100ms synchronization ticks and broadcasting
        real-time state to all participants globally.
      </p>
    </div>
  );
};
