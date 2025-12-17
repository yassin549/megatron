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
        }, 150);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (progress === 100) {
            // Wait a bit at 100% before fading out
            const timer = setTimeout(() => {
                setIsVisible(false);
                // Remove from DOM after fade out animation
                setTimeout(() => setShouldRender(false), 500);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [progress]);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            <div className="text-center space-y-6">
                {/* Title */}
                <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter animate-in fade-in zoom-in duration-700">
                    MEGATRON
                </h1>

                {/* Tagline */}
                <p className="text-lg md:text-xl text-gray-400 font-medium tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                    When world variables became stocks
                </p>

                {/* Progress Bar Container */}
                <div className="w-64 h-1 bg-gray-900 rounded-full mx-auto overflow-hidden mt-8">
                    {/* Progress Bar Fill */}
                    <div
                        className="h-full bg-white transition-all duration-200 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Percentage Text (Optional, keeps it cleaner without) */}
                <div className="text-xs text-gray-600 font-mono">
                    {Math.min(100, Math.round(progress))}%
                </div>
            </div>
        </div>
    );
}
