'use client';

import React from 'react';
import { motion } from 'framer-motion';

export function Background() {
    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-base pointer-events-none">
            {/* 1. Base Deep Gradient */}
            <div
                className="absolute inset-0 bg-gradient-to-br from-[#001a3d] via-[#000d1a] to-black opacity-100"
            />

            {/* 2. Top-Right Secondary Light Source */}
            <div
                className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-40 blur-[150px] bg-sky-500/30"
            />

            {/* 3. Neural Waves (SVG based for quality) */}
            <div className="absolute inset-0 z-10 opacity-30">
                <svg width="100%" height="100%" viewBox="0 0 1440 800" preserveAspectRatio="none" className="w-full h-full">
                    <defs>
                        <linearGradient id="wave-grad-1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00ccff" stopOpacity="0.1" />
                            <stop offset="50%" stopColor="#00ccff" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#00ccff" stopOpacity="0.1" />
                        </linearGradient>
                        <filter id="glow-wave">
                            <feGaussianBlur stdDeviation="5" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Animated Waves */}
                    <motion.path
                        d="M0 400 Q 360 250 720 400 T 1440 400"
                        stroke="url(#wave-grad-1)"
                        strokeWidth="2"
                        fill="none"
                        filter="url(#glow-wave)"
                        animate={{
                            d: [
                                "M0 400 Q 360 250 720 400 T 1440 400",
                                "M0 400 Q 360 550 720 400 T 1440 400",
                                "M0 400 Q 360 250 720 400 T 1440 400"
                            ]
                        }}
                        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <motion.path
                        d="M0 450 Q 400 300 800 450 T 1440 450"
                        stroke="#0088ff"
                        strokeWidth="1"
                        fill="none"
                        opacity="0.4"
                        animate={{
                            d: [
                                "M0 450 Q 400 300 800 450 T 1440 450",
                                "M0 450 Q 400 600 800 450 T 1440 450",
                                "M0 450 Q 400 300 800 450 T 1440 450"
                            ]
                        }}
                        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                    />
                </svg>
            </div>

            {/* 4. Architectural Lines/Grid Fragment (Bottom Left & Top Right) */}
            <div className="absolute inset-0 z-20 overflow-hidden">
                {/* Bottom Left Neural Grid */}
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] opacity-20 rotate-[15deg]">
                    <div className="absolute inset-0 border-r border-t border-sky-400/30" />
                    <div className="absolute top-1/4 right-0 w-full h-[1px] bg-sky-400/20" />
                    <div className="absolute top-1/2 right-0 w-full h-[1px] bg-sky-400/20" />
                    <div className="absolute top-3/4 right-0 w-full h-[1px] bg-sky-400/20" />
                    <div className="absolute top-0 right-1/4 h-full w-[1px] bg-sky-400/20" />
                    <div className="absolute top-0 right-1/2 h-full w-[1px] bg-sky-400/20" />
                    <div className="absolute top-0 right-3/4 h-full w-[1px] bg-sky-400/20" />

                    {/* Dots/Nodes */}
                    <div className="absolute top-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#00ccff]" />
                    <div className="absolute top-[50%] right-[50%] w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_#00ccff]" />
                    <div className="absolute top-[75%] right-[10%] w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#00ccff]" />
                </div>

                {/* Top Right Architectural Nodes */}
                <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] opacity-15 rotate-[-15deg]">
                    <div className="absolute inset-0 border-l border-b border-sky-400/30" />
                    <div className="absolute bottom-1/3 left-0 w-full h-[1px] bg-sky-400/20" />
                    <div className="absolute bottom-2/3 left-0 w-full h-[1px] bg-sky-400/20" />
                    <div className="absolute bottom-0 left-1/3 h-full w-[1px] bg-sky-400/20" />
                    <div className="absolute bottom-0 left-2/3 h-full w-[1px] bg-sky-400/20" />

                    <div className="absolute bottom-[33%] left-[33%] w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_#00ccff]" />
                    <div className="absolute bottom-[66%] left-[66%] w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_#00ccff]" />
                </div>
            </div>

            {/* 5. Global Particles/Nodes Overlay (Subtle) */}
            <div
                className="absolute inset-0 z-30 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0, 204, 255, 0.2) 1px, transparent 0)',
                    backgroundSize: '40px 40px'
                }}
            />
        </div>
    );
}
