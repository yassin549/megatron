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
            className={`fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_800px_at_50%_-20%,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

            <div className="text-center space-y-8 relative z-10">
                {/* Logo */}
                <div className="flex justify-center mb-2 overflow-visible">
                    <div className="relative w-24 h-24 md:w-32 md:h-32 animate-in fade-in zoom-in duration-500">
                        <img
                            src="/images/megatron-logo.jpg"
                            alt="Megatron Logo"
                            className="w-full h-full object-contain mix-blend-screen filter brightness-110 contrast-125"
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
                <p className="text-lg md:text-xl text-gray-400 font-medium tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-300 delay-500">
                    When world variables become stocks
                </p>

                {/* Progress Group */}
                <div className="space-y-3">
                    {/* Progress Bar Container */}
                    <div className="w-64 h-1 bg-gray-900 rounded-full mx-auto overflow-hidden">
                        {/* Progress Bar Fill */}
                        <div
                            className="h-full bg-white transition-all duration-200 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Percentage Indicator */}
                    <p className="text-sm font-mono text-muted-foreground animate-in fade-in duration-300">
                        {Math.round(progress)}%
                    </p>
                </div>
            </div>
        </div>
    );
}
