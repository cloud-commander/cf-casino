import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
]; // European format sequential layout

const getRedNumbers = () => [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
];

export const RouletteWheel: React.FC<{
  spinning: boolean;
  result: number | null;
}> = ({ spinning, result }) => {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (spinning) {
      // Fast continuous spin (5 full rotations)
      const t = setTimeout(() => setRotation((prev) => prev - 1800), 0);
      return () => clearTimeout(t);
    } else if (result !== null) {
      // Calculate stopping angle
      const targetIndex = ROULETTE_NUMBERS.indexOf(result);
      const sliceAngle = 360 / 37;

      // Negative rotation to align the target index with the top pointer (0 deg)
      const targetRotation = -(targetIndex * sliceAngle);

      const t = setTimeout(() => {
        setRotation((prev) => {
          // Find current base rotation to add final spins smoothly
          const currentRot = prev % 360;
          return prev + (360 - currentRot) - 1080 + targetRotation; // -3 extra spins then stop
        });
      }, 0);
      return () => clearTimeout(t);
    } else {
      // Reset position slightly if needed (optional, typically we leave it as is)
    }
  }, [spinning, result]);

  const sliceAngle = 360 / 37;

  // Build the conic gradient string to draw all 37 colored slices
  const conicStops = ROULETTE_NUMBERS.map((num, i) => {
    const isRed = getRedNumbers().includes(num);
    const color = num === 0 ? "#15803d" : isRed ? "#b91c1c" : "#171717";
    const start = i * sliceAngle;
    const end = (i + 1) * sliceAngle;
    // adding a tiny white border line via gradient could be complex, we will just use pure color blocks
    return `${color} ${start}deg ${end}deg`;
  }).join(", ");

  return (
    <div className="relative w-full max-w-[260px] xl:max-w-[320px] aspect-square mx-auto rounded-full border-[6px] border-black shadow-[0_0_40px_rgba(0,0,0,0.6)] flex items-center justify-center bg-neutral-900 overflow-hidden">
      {/* Static Pointer at the top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 translate-y-[2px] w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[20px] border-t-white z-30 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />

      {/* Outer rim inner shadow styling */}
      <div className="absolute inset-0 rounded-full border-[10px] border-[#8b5a2b]/80 shadow-inner z-20 pointer-events-none" />

      {/* The spinnable wheel */}
      <motion.div
        className="w-full h-full rounded-full relative"
        style={{
          // Offsetting the conic-gradient by -sliceAngle/2 focuses the slice perfectly under the 0 degree pointer
          background: `conic-gradient(from -${sliceAngle / 2}deg, ${conicStops})`,
        }}
        animate={{ rotate: rotation }}
        transition={{
          duration: spinning ? 5 : 4,
          ease: spinning ? "linear" : "easeOut",
        }}
      >
        {/* Render number labels */}
        {ROULETTE_NUMBERS.map((num, i) => {
          const rotationAngle = i * sliceAngle;
          return (
            <div
              key={num}
              className="absolute w-full h-full"
              style={{
                transform: `rotate(${rotationAngle}deg)`,
              }}
            >
              {/* Position text near the top edge of the rotated container */}
              <div className="absolute top-[12px] xl:top-[16px] left-1/2 -translate-x-1/2 text-[11px] xl:text-[13px] font-black text-white">
                {num}
              </div>

              {/* Optional delimiter lines between slices */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-white/20"
                style={{ transform: `rotate(${sliceAngle / 2}deg)` }}
              />
            </div>
          );
        })}

        {/* Inner Hub (Gold/Wood Center) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] h-[55%] rounded-full bg-gradient-to-br from-[#ffd700] to-[#b8860b] border-4 border-[#daa520] flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] z-10">
          {/* Center Pin Geometry */}
          <div className="w-[40%] h-[40%] rounded-full border-2 border-[#fff8dc]/50 flex items-center justify-center">
            <div className="w-1/3 h-1/3 rounded-full bg-gradient-to-br from-white to-gray-400 shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};
