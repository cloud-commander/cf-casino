import React, { useEffect, useState } from "react";
import { Globe, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export const GlobalEdgeMap: React.FC = () => {
  const [activeNodes, setActiveNodes] = useState<number[]>([]);

  // Simulate global nodes lighting up
  useEffect(() => {
    const interval = setInterval(() => {
      const nodeCount = Math.floor(Math.random() * 5) + 3;
      const nodes = Array.from({ length: nodeCount }, () =>
        Math.floor(Math.random() * 20),
      );
      setActiveNodes(nodes);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Mock node positions on a 2D plane representing a "map"
  const nodes = [
    { x: "15%", y: "30%", city: "San Francisco" },
    { x: "25%", y: "35%", city: "New York" },
    { x: "45%", y: "25%", city: "London" },
    { x: "48%", y: "32%", city: "Paris" },
    { x: "52%", y: "28%", city: "Frankfurt" },
    { x: "80%", y: "35%", city: "Tokyo" },
    { x: "85%", y: "65%", city: "Sydney" },
    { x: "20%", y: "60%", city: "Sao Paulo" },
    { x: "55%", y: "60%", city: "Johannesburg" },
    { x: "70%", y: "45%", city: "Singapore" },
    { x: "65%", y: "30%", city: "Mumbai" },
    { x: "40%", y: "40%", city: "Madrid" },
    { x: "10%", y: "45%", city: "Los Angeles" },
    { x: "30%", y: "20%", city: "Toronto" },
    { x: "75%", y: "25%", city: "Seoul" },
    { x: "18%", y: "38%", city: "Chicago" },
    { x: "82%", y: "50%", city: "Hong Kong" },
    { x: "50%", y: "50%", city: "Dubai" },
    { x: "35%", y: "55%", city: "Miami" },
    { x: "60%", y: "20%", city: "Stockholm" },
  ];

  return (
    <div className="bg-bg-tertiary border border-glass-medium rounded-xl p-4 shadow-xl flex flex-col gap-4 overflow-hidden relative group">
      <div className="flex justify-between items-center">
        <h3 className="text-xs font-black text-text-muted uppercase tracking-widest flex items-center gap-2">
          <Globe className="w-4 h-4 text-accent-teal" />
          Global Edge Network
        </h3>
        <div className="flex items-center gap-1 text-[10px] text-accent-green font-bold uppercase">
          <ShieldCheck className="w-3 h-3" /> 330+ Cities
        </div>
      </div>

      {/* Map Visualization */}
      <div className="relative h-32 bg-black/40 rounded-lg overflow-hidden border border-white/5">
        {/* Simple "Map" Dots (The static network) */}
        {nodes.map((node, i) => (
          <div
            key={i}
            style={{ left: node.x, top: node.y }}
            className="absolute w-1 h-1 bg-white/10 rounded-full"
          />
        ))}

        {/* Active Pulse Nodes */}
        {nodes.map(
          (node, i) =>
            activeNodes.includes(i) && (
              <div
                key={`active-${i}`}
                style={{ left: node.x, top: node.y }}
                className="absolute flex items-center justify-center -translate-x-1/2 -translate-y-1/2"
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [1, 3], opacity: [0.8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute w-4 h-4 bg-accent-teal rounded-full"
                />
                <div className="w-1.5 h-1.5 bg-accent-teal rounded-full shadow-[0_0_8px_#00e6cc]" />
              </div>
            ),
        )}

        {/* Floating Data Tickers */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end pointer-events-none">
          <div className="flex flex-col">
            <span className="text-[10px] text-white font-bold">
              LHR - 1.2ms
            </span>
            <span className="text-[8px] text-text-muted uppercase tracking-tighter">
              London, UK
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-accent-orange font-bold font-mono">
              ENCRYPTED
            </span>
            <span className="text-[8px] text-text-muted uppercase tracking-tighter">
              mTLS Handshake
            </span>
          </div>
        </div>
      </div>

      <div className="text-[10px] text-text-muted leading-tight">
        Requests are resolved at the nearest data center. No "Origin"
        round-trips required for gaming state.
      </div>
    </div>
  );
};
