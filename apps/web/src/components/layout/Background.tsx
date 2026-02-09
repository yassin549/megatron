'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/context/ThemeContext';

// Helper to convert HSL string "H S% L%" to usable formats
function hslToColors(hslString: string) {
    const [h, s, l] = hslString.split(' ').map(v => parseFloat(v));
    return {
        hsl: `hsl(${h}, ${s}%, ${l}%)`,
        hsla: (alpha: number) => `hsla(${h}, ${s}%, ${l}%, ${alpha})`,
        raw: { h, s, l }
    };
}

export function Background() {
    const { activeColors } = useTheme();

    // Derive theme colors
    const primary = hslToColors(activeColors.brandPrimary);
    const accent = hslToColors(activeColors.brandAccent);
    const base = hslToColors(activeColors.bgBase);

    // Create darker variants for base gradient
    const baseDark1 = `hsl(${base.raw.h}, ${base.raw.s}%, ${Math.max(base.raw.l - 2, 2)}%)`;
    const baseDark2 = `hsl(${base.raw.h}, ${base.raw.s}%, ${Math.max(base.raw.l - 4, 1)}%)`;
    const baseDark3 = `hsl(${base.raw.h}, ${base.raw.s}%, ${Math.max(base.raw.l - 6, 0)}%)`;

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none" style={{ backgroundColor: base.hsl }}>
            {/* 1. Base Vibrant Gradient */}
            <div
                className="absolute inset-0 opacity-100"
                style={{
                    backgroundImage: `linear-gradient(to bottom right, ${baseDark1}, ${baseDark2}, ${baseDark3})`
                }}
            />

            {/* 2. Top-Center/Right Primary Light Source */}
            <div
                className="absolute top-[-20%] left-[20%] w-[80%] h-[80%] rounded-full opacity-60 blur-[120px]"
                style={{ backgroundColor: primary.hsla(0.4) }}
            />

            <div
                className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-50 blur-[100px]"
                style={{ backgroundColor: accent.hsla(0.4) }}
            />

            {/* 3. Neural Waves (SVG based) */}
            <div className="absolute inset-0 z-10 opacity-60">
                <svg width="100%" height="100%" viewBox="0 0 1440 800" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                        <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={primary.hsl} stopOpacity="0.2" />
                            <stop offset="50%" stopColor={primary.hsl} stopOpacity="0.9" />
                            <stop offset="100%" stopColor={primary.hsl} stopOpacity="0.2" />
                        </linearGradient>
                        <linearGradient id="wave-grad-2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor={accent.hsl} stopOpacity="0.1" />
                            <stop offset="50%" stopColor={accent.hsl} stopOpacity="0.7" />
                            <stop offset="100%" stopColor={accent.hsl} stopOpacity="0.1" />
                        </linearGradient>
                        <filter id="glow-wave" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="8" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Highly Visible Animated Waves */}
                    <motion.path
                        d="M0 400 Q 360 200 720 400 T 1440 400"
                        stroke="url(#wave-grad-1)"
                        strokeWidth="3"
                        fill="none"
                        filter="url(#glow-wave)"
                        animate={{
                            d: [
                                "M0 400 Q 360 200 720 400 T 1440 400",
                                "M0 400 Q 360 600 720 400 T 1440 400",
                                "M0 400 Q 360 200 720 400 T 1440 400"
                            ]
                        }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <motion.path
                        d="M0 450 Q 400 250 800 450 T 1440 450"
                        stroke="url(#wave-grad-2)"
                        strokeWidth="2"
                        fill="none"
                        filter="url(#glow-wave)"
                        animate={{
                            d: [
                                "M0 450 Q 400 250 800 450 T 1440 450",
                                "M0 450 Q 400 650 800 450 T 1440 450",
                                "M0 450 Q 400 250 800 450 T 1440 450"
                            ]
                        }}
                        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    />

                    <motion.path
                        d="M0 350 Q 300 500 600 350 T 1440 350"
                        stroke={primary.hsl}
                        strokeWidth="1"
                        fill="none"
                        opacity="0.3"
                        animate={{
                            d: [
                                "M0 350 Q 300 500 600 350 T 1440 350",
                                "M0 350 Q 300 200 600 350 T 1440 350",
                                "M0 350 Q 300 500 600 350 T 1440 350"
                            ]
                        }}
                        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                    />
                </svg>
            </div>

            {/* 4. Architectural Lines/Grid Fragment */}
            <div className="absolute inset-0 z-20 overflow-hidden">
                {/* Bottom Left Neural Grid */}
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] opacity-30 rotate-[15deg]">
                    <div className="absolute inset-0" style={{ borderRight: `1px solid ${primary.hsla(0.6)}`, borderTop: `1px solid ${primary.hsla(0.6)}` }} />
                    <div className="absolute top-1/4 right-0 w-full h-[1px]" style={{ backgroundColor: primary.hsla(0.4) }} />
                    <div className="absolute top-1/2 right-0 w-full h-[1px]" style={{ backgroundColor: primary.hsla(0.4) }} />
                    <div className="absolute top-3/4 right-0 w-full h-[1px]" style={{ backgroundColor: primary.hsla(0.4) }} />
                    <div className="absolute top-0 right-1/4 h-full w-[1px]" style={{ backgroundColor: primary.hsla(0.4) }} />
                    <div className="absolute top-0 right-1/2 h-full w-[1px]" style={{ backgroundColor: primary.hsla(0.4) }} />
                    <div className="absolute top-0 right-3/4 h-full w-[1px]" style={{ backgroundColor: primary.hsla(0.4) }} />

                    {/* Dots/Nodes */}
                    <div className="absolute top-[25%] right-[25%] w-2 h-2 rounded-full" style={{ backgroundColor: primary.hsl, boxShadow: `0 0 12px ${primary.hsl}` }} />
                    <div className="absolute top-[50%] right-[50%] w-1.5 h-1.5 rounded-full" style={{ backgroundColor: primary.hsl, boxShadow: `0 0 10px ${primary.hsl}` }} />
                    <div className="absolute top-[75%] right-[10%] w-2 h-2 rounded-full" style={{ backgroundColor: primary.hsl, boxShadow: `0 0 12px ${primary.hsl}` }} />
                </div>

                {/* Top Right Architectural Nodes */}
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] opacity-25 rotate-[-15deg]">
                    <div className="absolute inset-0" style={{ borderLeft: `1px solid ${accent.hsla(0.6)}`, borderBottom: `1px solid ${accent.hsla(0.6)}` }} />
                    <div className="absolute bottom-1/3 left-0 w-full h-[1px]" style={{ backgroundColor: accent.hsla(0.4) }} />
                    <div className="absolute bottom-2/3 left-0 w-full h-[1px]" style={{ backgroundColor: accent.hsla(0.4) }} />
                    <div className="absolute bottom-0 left-1/3 h-full w-[1px]" style={{ backgroundColor: accent.hsla(0.4) }} />
                    <div className="absolute bottom-0 left-2/3 h-full w-[1px]" style={{ backgroundColor: accent.hsla(0.4) }} />

                    <div className="absolute bottom-[33%] left-[33%] w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent.hsl, boxShadow: `0 0 10px ${accent.hsl}` }} />
                    <div className="absolute bottom-[66%] left-[66%] w-2 h-2 rounded-full" style={{ backgroundColor: accent.hsl, boxShadow: `0 0 12px ${accent.hsl}` }} />
                </div>
            </div>

            {/* 5. Delicate Micro-Particles Overlay */}
            <div
                className="absolute inset-0 z-30 opacity-40 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle at 2px 2px, ${primary.hsla(0.3)} 1px, transparent 0)`,
                    backgroundSize: '32px 32px'
                }}
            />
        </div>
    );
}
