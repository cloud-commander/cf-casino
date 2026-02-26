"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RevenueTicker } from "./RevenueTicker";
import { StatusBadge, type AppStatus } from "./StatusBadge";
import { Flame, RefreshCw, HandCoins, Volume2, VolumeX } from "lucide-react";
import { RouletteWheel } from "./RouletteWheel";
import type { TablePhase, Jurisdiction } from "@/types/game";

interface StageProps {
  balance: number;
  balanceDelta: number;
  status: AppStatus;
  tablePhase: TablePhase;
  timeLeft: number;
  recentOutcome: number | null;
  activeBets: { amount: number; betType: string }[];
  onPlaceBet: (amount: number, betType: string) => void;
  onChaosTrigger: () => void;
  isSimulating?: boolean;
  jurisdiction: Jurisdiction;
  isRouletteSoundEnabled: boolean;
  onToggleRouletteSound: () => void;
}

export const Stage: React.FC<StageProps> = ({
  balance,
  balanceDelta,
  status,
  tablePhase,
  timeLeft,
  recentOutcome,
  activeBets,
  onPlaceBet,
  onChaosTrigger,
  isSimulating,
  jurisdiction,
  isRouletteSoundEnabled,
  onToggleRouletteSound,
}) => {
  const [chipSize, setChipSize] = useState<number>(50);

  const isBettingOpen = tablePhase === "IDLE";

  const getPhaseColor = () => {
    switch (tablePhase) {
      case "IDLE":
        return "bg-accent-green/20";
      case "SPINNING":
        return "bg-accent-teal/20";
      case "RESULT":
        return "bg-accent-pink/20";
      default:
        return "bg-glass-light";
    }
  };

  const isRed = (num: number) =>
    [
      1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
    ].includes(num);

  return (
    <div className="flex flex-col flex-1 gap-4 md:gap-6 p-4 md:p-8 rounded-2xl bg-bg-tertiary border border-glass-medium shadow-2xl relative overflow-hidden pb-20 lg:pb-8">
      {/* Background ambient glow effect based on table phase */}
      <AnimatePresence>
        <motion.div
          key={tablePhase}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className={`absolute top-0 right-0 -m-32 w-80 h-80 rounded-full blur-[100px] pointer-events-none transition-colors duration-1000 ${getPhaseColor()}`}
        />
      </AnimatePresence>

      <div className="flex justify-between items-start z-10 w-full relative">
        <div>
          <h1 className="text-xs md:text-sm font-semibold text-text-muted uppercase tracking-widest mb-1">
            Total Balance
          </h1>
          <RevenueTicker
            value={balance}
            delta={balanceDelta}
            className="text-4xl md:text-6xl font-bold text-text-primary drop-shadow-md"
          />
        </div>
        <StatusBadge
          status={status}
          className="md:scale-110 origin-top-right"
        />
      </div>

      {/* Table Status Bar */}
      <div className="flex items-center justify-between mt-2 md:mt-4 p-3 md:p-4 rounded-xl bg-glass-medium border border-glass-light z-10 shadow-inner">
        <div className="flex flex-col">
          <span className="text-[10px] md:text-xs text-text-muted uppercase font-bold tracking-widest mb-1">
            Table State
          </span>
          <span className="text-lg md:text-xl font-bold text-white capitalize flex items-center gap-2">
            {tablePhase === "SPINNING" && (
              <RefreshCw className="w-4 h-4 md:w-5 md:h-5 animate-spin text-accent-teal" />
            )}
            {tablePhase === "IDLE" ? "Open for Bets" : tablePhase.toLowerCase()}
          </span>
        </div>

        {recentOutcome !== null && tablePhase === "RESULT" && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-3xl md:text-5xl font-black shrink-0 text-accent-yellow drop-shadow-[0_0_15px_rgba(255,214,0,0.8)] mx-4"
          >
            {recentOutcome}
          </motion.div>
        )}

        <div className="flex flex-col items-end">
          <span className="text-[10px] md:text-xs text-text-muted uppercase font-bold tracking-widest mb-1">
            Time Left
          </span>
          <span
            className={`text-2xl md:text-3xl font-mono font-bold ${
              timeLeft <= 5
                ? "text-accent-pink animate-pulse"
                : "text-text-primary"
            }`}
          >
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Main Game Interface: Wheel + Betting Board */}
      <div className="flex flex-col-reverse lg:flex-row gap-6 md:gap-8 mt-4 z-10 flex-1 items-start w-full">
        {/* LEFT COLUMN: Roulette Wheel */}
        <div className="w-full lg:w-[320px] flex-none flex flex-col items-center justify-center p-4 md:p-6 bg-glass-medium rounded-2xl border border-glass-light shadow-inner bg-black/20 mx-auto">
          <RouletteWheel
            spinning={tablePhase === "SPINNING"}
            result={recentOutcome}
          />

          <div className="mt-6 md:mt-8 text-center relative w-full">
            <h3 className="text-base md:text-lg font-bold text-white uppercase tracking-widest mb-1 shadow-black drop-shadow-md">
              European Wheel
            </h3>
            <p className="text-[10px] md:text-xs text-text-muted font-bold uppercase tracking-widest">
              Single Zero (2.7% Edge)
            </p>

            <button
              onClick={onToggleRouletteSound}
              className={`absolute -top-2 -right-2 p-2 rounded-full border border-glass-light transition-all ${
                isRouletteSoundEnabled
                  ? "bg-accent-orange/10 text-accent-orange/50 hover:text-accent-orange"
                  : "bg-accent-orange/40 text-white shadow-lg shadow-accent-orange/20"
              }`}
              title={
                isRouletteSoundEnabled ? "Mute Roulette" : "Unmute Roulette"
              }
            >
              {isRouletteSoundEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Roulette Betting Board */}
        <div className="flex flex-col gap-4 flex-1 w-full min-w-0">
          <div className="hidden lg:flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-text-secondary uppercase tracking-widest">
              Place Bets
            </h3>
            <div className="flex gap-2 bg-bg-secondary p-1 rounded-lg border border-glass-light">
              {[10, 50, 100].map((size) => (
                <button
                  key={size}
                  onClick={() => setChipSize(size)}
                  disabled={!isBettingOpen}
                  className={`w-12 h-12 rounded-full font-bold transition-all ${
                    chipSize === size
                      ? "bg-accent-yellow text-black scale-110 shadow-[0_0_10px_rgba(255,214,0,0.5)]"
                      : "bg-glass-medium text-text-muted border border-glass-light"
                  } disabled:opacity-50 flex items-center justify-center`}
                >
                  <span className="text-sm">£</span>
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full">
            {/* OVERLAYS */}
            {!isBettingOpen && (
              <div className="absolute inset-0 z-20 bg-bg-primary/70 backdrop-blur-sm rounded-xl flex items-center justify-center border border-glass-medium shadow-2xl">
                <span className="text-2xl md:text-3xl font-black uppercase tracking-[0.2em] text-accent-pink drop-shadow-md bg-black/60 px-6 py-2 rounded">
                  bets closed
                </span>
              </div>
            )}

            {!jurisdiction.isAllowed && (
              <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-[4px] rounded-xl flex flex-col items-center justify-center border border-accent-orange/50 shadow-2xl p-2 md:p-4 text-center overflow-hidden transition-all animate-in fade-in zoom-in duration-300">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-accent-orange/20 rounded-full flex items-center justify-center mb-1 md:mb-2 border border-accent-orange/50 shrink-0">
                  <span className="text-xl md:text-2xl">🚫</span>
                </div>
                <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-accent-orange mb-1 shrink-0 whitespace-nowrap">
                  Jurisdictional Restriction
                </h3>
                <p className="text-[10px] md:text-xs text-text-muted px-4 leading-normal w-[90%] min-w-[300px] max-w-lg shrink-0">
                  Real-money roulette is not permitted in your current location
                  (
                  <span className="text-white font-bold">
                    {jurisdiction.name}
                  </span>
                  ). Cloudflare Edge Compliance has automatically gated this
                  feature.
                </p>
                <div className="mt-1 md:mt-2 px-3 py-1 bg-glass-medium rounded border border-glass-light text-[8px] md:text-[9px] font-mono text-text-muted uppercase tracking-tighter shrink-0 select-all">
                  RegID: CF-GEO-{jurisdiction.code}-PROHIBITED
                </div>
              </div>
            )}

            {/* ---> MOBILE BOARD (Vertical Ergonomic) <--- */}
            <div className="flex lg:hidden flex-col select-none relative w-full max-w-[340px] mx-auto gap-1">
              <button
                onClick={() => onPlaceBet(chipSize, "0")}
                className="w-full h-12 bg-green-700 hover:bg-green-600 border border-white/20 rounded-t-xl text-white font-black text-2xl transition-all shadow-inner"
              >
                0
              </button>

              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }).map((_, rowIndex) => {
                  return [1, 2, 3].map((col) => {
                    const num = rowIndex * 3 + col;
                    return (
                      <button
                        key={num}
                        onClick={() => onPlaceBet(chipSize, num.toString())}
                        className={`h-12 border border-white/20 text-white font-bold text-lg flex items-center justify-center transition-all shadow-inner ${
                          isRed(num)
                            ? "bg-red-700 hover:bg-red-600"
                            : "bg-neutral-900 hover:bg-neutral-800"
                        }`}
                      >
                        {num}
                      </button>
                    );
                  });
                })}
              </div>

              <div className="grid grid-cols-3 gap-1 mt-1">
                <button
                  onClick={() => onPlaceBet(chipSize, "Row 3 (2:1)")}
                  className="h-10 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/80 font-bold text-xs shadow-inner"
                >
                  2:1
                </button>
                <button
                  onClick={() => onPlaceBet(chipSize, "Row 2 (2:1)")}
                  className="h-10 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/80 font-bold text-xs shadow-inner"
                >
                  2:1
                </button>
                <button
                  onClick={() => onPlaceBet(chipSize, "Row 1 (2:1)")}
                  className="h-10 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/80 font-bold text-xs shadow-inner"
                >
                  2:1
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1 mt-1">
                <button
                  onClick={() => onPlaceBet(chipSize, "1st 12")}
                  className="h-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/90 font-bold text-sm shadow-inner"
                >
                  1st 12
                </button>
                <button
                  onClick={() => onPlaceBet(chipSize, "2nd 12")}
                  className="h-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/90 font-bold text-sm shadow-inner"
                >
                  2nd 12
                </button>
                <button
                  onClick={() => onPlaceBet(chipSize, "3rd 12")}
                  className="h-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/90 font-bold text-sm shadow-inner"
                >
                  3rd 12
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 mt-1">
                <button
                  onClick={() => onPlaceBet(chipSize, "1 to 18")}
                  className="h-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/90 font-bold text-sm rounded-bl-xl shadow-inner"
                >
                  1 to 18
                </button>
                <button
                  onClick={() => onPlaceBet(chipSize, "19 to 36")}
                  className="h-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/90 font-bold text-sm rounded-br-xl shadow-inner"
                >
                  19 to 36
                </button>
                <button
                  onClick={() => onPlaceBet(chipSize, "Even")}
                  className="h-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/90 font-bold text-sm shadow-inner"
                >
                  EVEN
                </button>
                <button
                  onClick={() => onPlaceBet(chipSize, "Odd")}
                  className="h-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white/90 font-bold text-sm shadow-inner"
                >
                  ODD
                </button>
                <button
                  onClick={() => onPlaceBet(chipSize, "Red")}
                  className="h-12 bg-red-700 hover:bg-red-600 border border-white/20 flex justify-center items-center shadow-inner"
                >
                  <div className="w-5 h-5 rotate-45 bg-red-500 rounded-sm" />
                </button>
                <button
                  onClick={() => onPlaceBet(chipSize, "Black")}
                  className="h-12 bg-neutral-900 hover:bg-neutral-800 border border-white/20 flex justify-center items-center shadow-inner"
                >
                  <div className="w-5 h-5 rotate-45 bg-black border border-white/30 rounded-sm" />
                </button>
              </div>
            </div>

            {/* ---> DESKTOP BOARD (Horizontal) <--- */}
            <div className="hidden lg:flex flex-col select-none relative min-w-[700px] xl:min-w-[800px] overflow-x-auto pb-4">
              <div className="flex w-full gap-1 h-40">
                <button
                  onClick={() => onPlaceBet(chipSize, "0")}
                  className="w-16 flex-shrink-0 bg-green-700 hover:bg-green-600 border border-white/20 rounded-l-lg text-white font-black text-2xl transition-all"
                >
                  0
                </button>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex-1 flex gap-1">
                    {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36].map(
                      (num) => (
                        <button
                          key={num}
                          onClick={() => onPlaceBet(chipSize, num.toString())}
                          className={`flex-1 ${
                            isRed(num)
                              ? "bg-red-700 hover:bg-red-600"
                              : "bg-neutral-900 hover:bg-neutral-800"
                          } border border-white/20 text-white font-bold text-lg transition-all`}
                        >
                          {num}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() => onPlaceBet(chipSize, "Row 1 (2:1)")}
                      className="w-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold text-xs rounded-r-lg max-w-12 break-words text-center"
                    >
                      2 to 1
                    </button>
                  </div>
                  <div className="flex-1 flex gap-1">
                    {[2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35].map(
                      (num) => (
                        <button
                          key={num}
                          onClick={() => onPlaceBet(chipSize, num.toString())}
                          className={`flex-1 ${
                            isRed(num)
                              ? "bg-red-700 hover:bg-red-600"
                              : "bg-neutral-900 hover:bg-neutral-800"
                          } border border-white/20 text-white font-bold text-lg transition-all`}
                        >
                          {num}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() => onPlaceBet(chipSize, "Row 2 (2:1)")}
                      className="w-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold text-xs rounded-r-lg max-w-12 break-words text-center"
                    >
                      2 to 1
                    </button>
                  </div>
                  <div className="flex-1 flex gap-1">
                    {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34].map(
                      (num) => (
                        <button
                          key={num}
                          onClick={() => onPlaceBet(chipSize, num.toString())}
                          className={`flex-1 ${
                            isRed(num)
                              ? "bg-red-700 hover:bg-red-600"
                              : "bg-neutral-900 hover:bg-neutral-800"
                          } border border-white/20 text-white font-bold text-lg transition-all`}
                        >
                          {num}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() => onPlaceBet(chipSize, "Row 3 (2:1)")}
                      className="w-12 bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold text-xs rounded-r-lg max-w-12 break-words text-center"
                    >
                      2 to 1
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex w-full mt-1 gap-1">
                <div className="w-16 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-3 gap-1 h-12">
                  <button
                    onClick={() => onPlaceBet(chipSize, "1st 12")}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold rounded-bl-md"
                  >
                    1st 12
                  </button>
                  <button
                    onClick={() => onPlaceBet(chipSize, "2nd 12")}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold"
                  >
                    2nd 12
                  </button>
                  <button
                    onClick={() => onPlaceBet(chipSize, "3rd 12")}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold"
                  >
                    3rd 12
                  </button>
                </div>
                <div className="w-12 flex-shrink-0" />
              </div>

              <div className="flex w-full mt-1 gap-1">
                <div className="w-16 flex-shrink-0" />
                <div className="flex-1 grid grid-cols-6 gap-1 h-12">
                  <button
                    onClick={() => onPlaceBet(chipSize, "1 to 18")}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold text-sm rounded-bl-xl"
                  >
                    1 to 18
                  </button>
                  <button
                    onClick={() => onPlaceBet(chipSize, "Even")}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold text-sm"
                  >
                    EVEN
                  </button>
                  <button
                    onClick={() => onPlaceBet(chipSize, "Red")}
                    className="bg-red-700 hover:bg-red-600 border border-white/20 flex justify-center items-center"
                  >
                    <div className="w-6 h-6 rotate-45 bg-red-500 rounded-sm" />
                  </button>
                  <button
                    onClick={() => onPlaceBet(chipSize, "Black")}
                    className="bg-neutral-900 hover:bg-neutral-800 border border-white/20 flex justify-center items-center"
                  >
                    <div className="w-6 h-6 rotate-45 bg-black border border-white/30 rounded-sm" />
                  </button>
                  <button
                    onClick={() => onPlaceBet(chipSize, "Odd")}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold text-sm"
                  >
                    ODD
                  </button>
                  <button
                    onClick={() => onPlaceBet(chipSize, "19 to 36")}
                    className="bg-neutral-800 hover:bg-neutral-700 border border-white/20 text-white font-bold text-sm rounded-br-xl"
                  >
                    19 to 36
                  </button>
                </div>
                <div className="w-12 flex-shrink-0" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Active Bets & Controls */}
      <div className="hidden lg:flex flex-col w-full">
        <div className="mt-4 w-full bg-bg-secondary rounded-xl p-4 border border-glass-light overflow-y-auto">
          <h4 className="text-xs text-text-muted uppercase font-bold tracking-widest mb-3 flex items-center gap-2">
            <HandCoins className="w-4 h-4" /> My Active Bets
          </h4>
          <div className="flex flex-wrap gap-2">
            {activeBets.length === 0 ? (
              <div className="text-sm text-text-muted italic">
                No bets placed this round.
              </div>
            ) : (
              activeBets.map((bet, i) => (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={i}
                  className="flex items-center gap-2 bg-glass-medium px-3 py-1.5 rounded-full border border-glass-light"
                >
                  <div
                    className={`w-3 h-3 rounded-full ${
                      bet.betType === "Red"
                        ? "bg-red-500"
                        : bet.betType === "Black"
                          ? "bg-neutral-900 border border-gray-600"
                          : "bg-green-500"
                    }`}
                  />
                  <span className="font-bold text-sm text-white">
                    £{bet.amount}
                  </span>
                </motion.div>
              ))
            )}
          </div>
        </div>
        <div className="flex justify-end pt-4">
          <Button
            onClick={onChaosTrigger}
            variant="outline"
            disabled={isSimulating}
            className="h-12 px-6 text-sm border-accent-pink/30 bg-accent-pink/5 text-accent-pink hover:bg-accent-pink hover:text-white uppercase tracking-widest transition-all"
          >
            <Flame className="w-4 h-4 mr-2" />
            Simulate 10k Users
          </Button>
        </div>
      </div>

      {/* MOBILE THUMB ZONE (Sticky Bottom) */}
      <div className="fixed lg:hidden bottom-0 left-0 right-0 w-full bg-black/90 backdrop-blur-xl border-t border-glass-light px-4 py-3 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col gap-3 w-full">
          <div className="flex gap-2 overflow-x-auto pb-1 items-center no-scrollbar min-h-[24px]">
            <span className="text-[10px] font-bold text-text-muted shrink-0 uppercase tracking-widest whitespace-nowrap leading-none align-middle flex items-center h-full">
              My Bets:
            </span>
            {activeBets.length === 0 ? (
              <span className="text-[10px] text-text-muted italic leading-none align-middle flex items-center h-full">
                None yet
              </span>
            ) : (
              activeBets.map((bet, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 bg-glass-medium px-2 py-0.5 rounded-full border border-glass-light/50 shrink-0 h-full max-h-[22px]"
                >
                  <div
                    className={`shrink-0 w-2 h-2 rounded-full ${
                      bet.betType === "Red"
                        ? "bg-red-500"
                        : bet.betType === "Black"
                          ? "bg-neutral-900 border border-gray-600"
                          : "bg-green-500"
                    }`}
                  />
                  <span className="font-bold text-[10px] text-white leading-none flex items-center h-full">
                    £{bet.amount}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-center gap-3">
            <div className="flex gap-2 flex-1">
              {[10, 50, 100].map((size) => (
                <button
                  key={size}
                  onClick={() => setChipSize(size)}
                  disabled={!isBettingOpen}
                  className={`flex-1 h-12 rounded-2xl font-black text-sm transition-all ${
                    chipSize === size
                      ? "bg-accent-yellow text-black scale-105 shadow-[0_0_15px_rgba(255,214,0,0.4)]"
                      : "bg-glass-medium text-text-muted border border-glass-light hover:bg-glass-light"
                  } disabled:opacity-50`}
                >
                  £{size}
                </button>
              ))}
            </div>

            <button
              onClick={onChaosTrigger}
              disabled={isSimulating}
              className="w-12 h-12 rounded-2xl border border-accent-pink/50 bg-accent-pink/20 text-accent-pink shadow-[0_0_10px_rgba(236,72,153,0.3)] flex items-center justify-center shrink-0 active:scale-95 transition-all"
            >
              <Flame className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
