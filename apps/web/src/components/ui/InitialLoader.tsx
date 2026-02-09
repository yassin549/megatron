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
            className={`fixed inset-0 z-[9999] bg-[#000] flex flex-col items-center justify-center transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            <div className="text-center space-y-8 relative z-10">
                {/* Logo */}
                <div className="flex justify-center mb-2 overflow-visible">
                    <div className="relative w-24 h-24 md:w-32 md:h-32 animate-in fade-in zoom-in duration-200">
                        <img
                            src="/images/megatron-logo.jpg"
                            alt="Megatron Logo"
                            className="w-full h-full object-contain filter brightness-110 contrast-125 transition-all duration-200"
                        />
                    </div>
                </div>

                {/* Title with Zoom/Breathe Effect */}
                <div className="h-20 flex items-center justify-center">
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter animate-breathe">
                        MEGATRON
                    </h1>
                </div>

                {/* Tagline */}
                <p className="text-lg md:text-xl text-text-muted font-medium tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-200 delay-150">
                    When world variables become stocks
                </p>

                {/* Progress Group */}
                <div className="space-y-4">
                    {/* Progress Bar Container */}
                    <div className="w-64 h-1 bg-surface rounded-full mx-auto overflow-hidden">
                        {/* Progress Bar Fill */}
                        <div
                            className="h-full bg-white transition-all duration-200 ease-out shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Percentage Indicator */}
                    <div className="flex flex-col items-center gap-1">
                        <p className="text-xs font-mono text-white/40 uppercase tracking-[0.2em] animate-pulse">
                            Initializing Systems
                        </p>
                        <p className="text-sm font-mono text-white/60">
                            {Math.round(progress)}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
