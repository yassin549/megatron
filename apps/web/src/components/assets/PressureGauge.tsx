'use client';

import { motion } from 'framer-motion';

/**
 * A minimalist SVG pressure gauge component.
 * Visualizes buying vs selling pressure with a needle animation.
 */
interface PressureGaugeProps {
    value: number; // 0 (100% Sell Pressure) to 100 (100% Buy Pressure)
}

export function PressureGauge({ value }: PressureGaugeProps) {
    // Map value (0-100) to rotation (-90deg to 90deg)
    // Red side is -90deg, Green side is 90deg.
    const rotation = (value / 100) * 180 - 90;

    return (
        <div className="relative w-14 h-9 flex flex-col items-center justify-end overflow-hidden group/gauge">
            {/* Gauge Label Overlay (Shown on hover) */}
            <div className="absolute top-0 inset-x-0 flex justify-between px-1.5 opacity-0 group-hover/gauge:opacity-100 transition-opacity duration-300 pointer-events-none">
                <span className="text-[5px] font-black text-rose-500 uppercase tracking-tighter">Sell</span>
                <span className="text-[5px] font-black text-emerald-500 uppercase tracking-tighter">Buy</span>
            </div>

            {/* Gauge Background Arc */}
            <svg viewBox="0 0 100 55" className="w-full h-full drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]">
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F43F5E" /> {/* Rose/Red */}
                        <stop offset="50%" stopColor="#EAB308" /> {/* Yellow/Neutral */}
                        <stop offset="100%" stopColor="#10B981" /> {/* Emerald/Green */}
                    </linearGradient>
                </defs>

                {/* Background Shadow/Track */}
                <path
                    d="M 15,50 A 35,35 0 0 1 85,50"
                    fill="none"
                    stroke="#ffffff05"
                    strokeWidth="10"
                    strokeLinecap="round"
                />

                {/* Colored Gradient Track */}
                <path
                    d="M 15,50 A 35,35 0 0 1 85,50"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="opacity-40"
                />
            </svg>

            {/* Needle Container */}
            <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                    className="relative w-full h-full flex justify-center"
                    animate={{ rotate: rotation }}
                    transition={{
                        type: 'spring',
                        stiffness: 40,
                        damping: 12,
                        mass: 0.5
                    }}
                >
                    {/* The Needle Pin */}
                    <div className="absolute bottom-[2px] w-[1.5px] h-[22px] bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.4)] origin-bottom" />
                </motion.div>
            </div>

            {/* Center Pivot Point */}
            <div className="absolute bottom-[-1px] w-2 h-2 rounded-full bg-white shadow-xl z-10 border border-black/20" />

            {/* Base indicators */}
            <div className="absolute bottom-0 w-full flex justify-between px-2 text-[6px] font-black text-zinc-700 select-none pb-0.5">
                <span>-</span>
                <span>+</span>
            </div>
        </div>
    );
}
