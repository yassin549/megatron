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
    const rotation = (value / 100) * 180 - 90;

    return (
        <div className="relative w-10 h-6 flex items-center justify-center overflow-hidden group/gauge">
            {/* Simple Background Arc */}
            <svg viewBox="0 0 100 60" className="w-full h-full">
                <defs>
                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#F43F5E" /> {/* Rose */}
                        <stop offset="50%" stopColor="#EAB308" /> {/* Yellow */}
                        <stop offset="100%" stopColor="#10B981" /> {/* Emerald */}
                    </linearGradient>
                </defs>

                {/* Main Track */}
                <path
                    d="M 20,50 A 30,30 0 0 1 80,50"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    className="opacity-25"
                />

                {/* Subtle Glow Track */}
                <path
                    d="M 20,50 A 30,30 0 0 1 80,50"
                    fill="none"
                    stroke="url(#gaugeGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="opacity-60 blur-[1px]"
                />
            </svg>

            {/* Needle */}
            <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                    className="relative w-full h-full flex justify-center"
                    animate={{ rotate: rotation }}
                    transition={{
                        type: 'spring',
                        stiffness: 60,
                        damping: 15,
                        mass: 0.8
                    }}
                >
                    <div className="absolute bottom-[2px] w-[1px] h-[16px] bg-white rounded-full shadow-[0_0_5px_rgba(255,255,255,0.8)] origin-bottom" />
                </motion.div>
            </div>
        </div>
    );
}
