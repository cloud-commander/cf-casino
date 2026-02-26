import React from "react";
import { BookOpen, ShieldCheck, Database, FileText } from "lucide-react";

export const EducationTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-10">
      {/* Header */}
      <div className="bg-glass-medium border border-glass-light rounded-xl p-5">
        <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent-teal" /> Education &
          Compliance
        </h3>
        <p className="text-sm text-text-muted leading-relaxed">
          iGaming represents one of the most strictly regulated industries
          globally. To operate legally in jurisdictions like the UK and EU,
          operators must provide irrefutable proof of fairness, complete audit
          trails, and strict financial integrity. Here is how CF Casino achieves
          this on the Edge.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* The Double Spend Problem */}
        <div className="bg-bg-secondary rounded-xl p-5 border-l-[3px] border-l-accent-pink border-t border-r border-b border-glass-light flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="w-5 h-5 text-accent-pink" />
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">
              The "Double Spend" Vulnerability
            </h4>
          </div>
          <p className="text-xs text-text-muted leading-relaxed mb-3">
            Why can't we just use Cloudflare KV for player balances? KV is an
            <strong> Eventually Consistent</strong> datastore designed for
            high-read, low-write caching. If a player quickly submits two £10
            bets from different locations, both could read the same old balance
            before it updates globally. The player would successfully stake £20
            using only £10.
          </p>
        </div>

        {/* The D1 Source of Truth */}
        <div className="bg-bg-secondary rounded-xl p-5 border-l-[3px] border-l-blue-400 border-t border-r border-b border-glass-light flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-5 h-5 text-blue-400" />
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">
              D1 Database (SQL) as the Source of Truth
            </h4>
          </div>
          <p className="text-xs text-text-muted leading-relaxed mb-2">
            Regulators (e.g., UKGC, MGA) require a strict, ACID-compliant audit
            trail. Cloudflare D1 provides relational integrity, ensuring that
            even if a server crashes, financial events are accurately recorded.
            It is the persistence layer that says:
          </p>
          <em className="text-xs text-white bg-bg-primary px-3 py-2 rounded border border-white/5 inline-block">
            "You ended yesterday with £450."
          </em>
        </div>

        {/* DO as the Atomic Engine */}
        <div className="bg-bg-secondary rounded-xl p-5 border-l-[3px] border-l-accent-yellow border-t border-r border-b border-glass-light flex flex-col">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-accent-yellow" />
            <h4 className="text-sm font-bold text-white uppercase tracking-widest">
              Durable Objects as the Atomic Engine
            </h4>
          </div>
          <p className="text-xs text-text-muted leading-relaxed mb-2">
            To achieve high performance without sacrificing consistency, CF
            Casino uses
            <strong> Durable Objects</strong> as the live atomic engine. A
            Durable Object acts as a single-threaded "mini-database." When you
            play, your balance is hydrated from D1. Then, all bets happen
            synchronously in DO memory. No one else can touch the balance until
            the action completes.
          </p>
          <em className="text-xs text-white bg-bg-primary px-3 py-2 rounded border border-white/5 inline-block">
            "I just took £10 from your £450. You now have £440."
          </em>
          <p className="text-xs text-text-muted leading-relaxed mt-3">
            Once confirmed, the action is asynchronously streamed back to D1 via{" "}
            <strong>Cloudflare Queues</strong>. This means the database write
            never blocks or slows down the live gameplay.
          </p>
        </div>
      </div>
    </div>
  );
};
