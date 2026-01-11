'use client';

import { useEffect, useState } from 'react';

export function InitialLoader() {
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress((prev) => {
                const next = prev + Math.random() * 10;
                if (next >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                return next;
            });
        }, 75);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (progress === 100) {
            // Wait a bit at 100% before fading out
            const timer = setTimeout(() => {
                setIsVisible(false);
                // Remove from DOM after fade out animation
                setTimeout(() => setShouldRender(false), 300);
            }, 400); // Slightly longer pause to read text
            return () => clearTimeout(timer);
        }
    }, [progress]);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-obsidian-950 flex flex-col items-center justify-center transition-opacity duration-700 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />

            <div className="text-center space-y-8 relative z-10">
                {/* Logo with Glow */}
                <div className="flex justify-center mb-4">
                    <div className="relative w-32 h-32 md:w-40 md:h-40">
                        <div className="absolute inset-0 bg-primary/20 blur-[60px] animate-pulse" />
                        <img
                            src="/images/megatron-logo.jpg"
                            alt="Megatron Logo"
                            className="w-full h-full object-contain relative z-10 mix-blend-screen brightness-125 contrast-125"
                        />
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none">
                        MEGATRON
                    </h1>
                    <p className="text-[10px] md:text-xs text-primary font-black uppercase tracking-[0.4em] opacity-80">
                        Institutional Grade Variable Trading
                    </p>
                </div>

                {/* Progress Bar Container */}
                <div className="w-64 md:w-80 h-[2px] bg-white/5 rounded-full mx-auto overflow-hidden mt-12 relative">
                    <div className="absolute inset-0 bg-primary/5 blur-sm" />
                    {/* Progress Bar Fill */}
                    <div
                        className="h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="h-4">
                    <p className="text-[9px] text-zinc-600 font-mono uppercase tracking-widest">
                        {progress < 100 ? `Synchronizing Neural Engine... ${Math.round(progress)}%` : 'Link Established'}
                    </p>
                </div>
            </div>
        </div>
    );
}
