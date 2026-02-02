'use client';

import { motion } from 'framer-motion';

/**
 * A minimalist SVG pressure gauge component.
 * Visualizes buying vs selling pressure with a needle animation.
 */
interface PressureGaugeProps {
    value: number; // 0 (100% Sell Pressure) to 100 (100% Buy Pressure)
    size?: 'sm' | 'md';
}

export function PressureGauge({ value, size = 'md' }: PressureGaugeProps) {
    // Map value (0-100) to rotation (-90deg to 90deg)
    const rotation = (value / 100) * 180 - 90;

    const dimensions = size === 'sm' ? 'w-8 h-5' : 'w-10 h-7';

    return (
        <div className={`relative ${dimensions} flex items-center justify-center group/gauge rounded-md overflow-visible`}>
            {/* Simple Background Arc */}
            <svg viewBox="0 -5 100 65" className="w-full h-full overflow-visible preserve-3d">
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#EF4444" /> {/* Bright Red - SELL */}
                        <stop offset="50%" stopColor="#F97316" /> {/* Bright Orange - NEUTRAL */}
                        <stop offset="100%" stopColor="#22C55E" /> {/* Bright Green - BUY */}
                    </linearGradient>
                </defs>

                {/* Background Track - Solid dark base for contrast */}
                <path
                    d="M 20,50 A 30,30 0 0 1 80,50"
                    fill="none"
                    stroke="#0A0A0A"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="opacity-100"
                />

                {/* Colored Progress Track */}
                <path
                    d="M 20,50 A 30,30 0 0 1 80,50"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className="opacity-100"
                />

                {/* Neon Glow Layer */}
                <path
                    d="M 20,50 A 30,30 0 0 1 80,50"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="opacity-80 blur-[4px]"
                />
            </svg>

            {/* Needle - High Contrast */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none translate-y-[2px]">
                <motion.div
                    className="relative w-full h-full flex justify-center"
                    initial={{ rotate: rotation }}
                    animate={{ rotate: rotation }}
                    transition={{
                        type: 'spring',
                        stiffness: 150,
                        damping: 15,
                        mass: 0.5
                    }}
                >
                    {/* The Line (Needle) */}
                    <div className="absolute bottom-[2px] w-[2.5px] h-[18px] bg-white rounded-full shadow-[0_0_12px_rgba(255,255,255,1)] origin-bottom z-10" />

                    {/* Pivot point dot */}
                    <div className="absolute bottom-[-2px] w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 border border-zinc-900" />
                </motion.div>
            </div>
        </div>
    );
}
