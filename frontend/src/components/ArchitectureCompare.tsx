import React from "react";
import { Server, Zap, Shield, Database, Cloud } from "lucide-react";

export const ArchitectureCompare: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-10">
      {/* Header */}
      <div className="bg-glass-medium border border-glass-light rounded-xl p-5">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent-yellow" /> The Cloudflare
          Advantage
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          Why build a globally synchronized casino on Cloudflare? Traditional
          clouds struggle with latency and high egress costs for real-time
          multiplayer at scale. CF Casino utilizes an{" "}
          <strong>Edge-First Architecture</strong> to solve this.
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cloudflare Platform */}
        <div className="bg-bg-secondary rounded-xl p-5 border-t-[3px] border-t-accent-orange border-l border-r border-b border-glass-light flex flex-col pt-4">
          <div className="mb-4">
            <span className="text-xs font-black tracking-widest uppercase text-accent-orange bg-accent-orange/10 px-2 py-1 rounded">
              CF Casino (Cloudflare)
            </span>
          </div>
          <ul className="space-y-4 flex-1">
            <li className="flex gap-3">
              <Server className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <strong className="block text-sm text-white">
                  Durable Objects
                </strong>
                <span className="text-xs text-text-muted">
                  Single-source-of-truth state machines (Roulette Table) running
                  milleseconds from users.
                </span>
              </div>
            </li>
            <li className="flex gap-3">
              <Zap className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <strong className="block text-sm text-white">
                  Edge Workers
                </strong>
                <span className="text-xs text-text-muted">
                  Global routing and JWT auth executed at point-of-presence
                  (sub-5ms).
                </span>
              </div>
            </li>
            <li className="flex gap-3">
              <Shield className="w-5 h-5 text-green-400 shrink-0" />
              <div>
                <strong className="block text-sm text-white">
                  £0 Egress Fees
                </strong>
                <span className="text-xs text-text-muted">
                  Massive savings broadcasting RealtimeKit audio and 100ms sync
                  ticks globally.
                </span>
              </div>
            </li>
          </ul>
        </div>

        {/* Traditional Cloud */}
        <div className="bg-bg-secondary rounded-xl p-5 border-t-[3px] border-t-red-500 border-l border-r border-b border-glass-light flex flex-col pt-4 opacity-70">
          <div className="mb-4 flex justify-between items-center">
            <span className="text-xs font-black tracking-widest uppercase text-red-500 bg-red-500/10 px-2 py-1 rounded">
              Traditional Cloud (AWS/GCP)
            </span>
          </div>
          <ul className="space-y-4 flex-1">
            <li className="flex gap-3">
              <Cloud className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <strong className="block text-sm text-white">
                  Regional Compute
                </strong>
                <span className="text-xs text-text-muted">
                  Centralised servers force users in Asia to suffer 200ms+ round
                  trips to US-East APIs.
                </span>
              </div>
            </li>
            <li className="flex gap-3">
              <Database className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <strong className="block text-sm text-white">
                  Database Locks
                </strong>
                <span className="text-xs text-text-muted">
                  Heavy Postgres transactions required for atomicity scaling
                  poorly under load.
                </span>
              </div>
            </li>
            <li className="flex gap-3">
              <Shield className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <strong className="block text-sm text-white">
                  Punishing Egress
                </strong>
                <span className="text-xs text-text-muted">
                  Broadcasting continuous WebSockets to 10k users results in
                  exorbitant bandwidth bills.
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Diagram / Flow Context */}
      <div className="bg-glass-medium border border-glass-light rounded-xl p-5">
        <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-widest border-b border-white/10 pb-2">
          The Two-Phase Commit Pattern
        </h4>
        <div className="text-xs text-text-muted space-y-2">
          <p>
            Traditional betting requires holding database locks, which is slow
            and resource-heavy. By utilising Cloudflare{" "}
            <strong>Durable Objects</strong>, CF Casino serializes all requests
            for a single roulette table in a single memory thread.
          </p>
          <div className="bg-bg-primary rounded p-3 font-mono mt-2 border border-white/5 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-accent-orange">1. Authorize:</span>
              <span className="text-gray-400">DO memory locks funds</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-accent-teal">2. Confirm:</span>
              <span className="text-gray-400">
                DO accepts bet, enqueues log
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-accent-pink">3. Async Audit:</span>
              <span className="text-gray-400">Queue batches to D1 SQLite</span>
            </div>
          </div>
          <p className="pt-2 text-accent-green font-bold">
            Result: 10,000 req/sec at near-zero incremental database cost.
          </p>
        </div>
      </div>
    </div>
  );
};
