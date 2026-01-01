'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function InitialLoader() {
    const pathname = usePathname();
    const lastPathname = useRef(pathname);
    const [progress, setProgress] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const [shouldRender, setShouldRender] = useState(true);

    // Function to run the animation
    const runAnimation = () => {
        setProgress(0);
        setIsVisible(true);
        setShouldRender(true);

        const timer = setInterval(() => {
            setProgress((prev) => {
                const next = prev + Math.random() * 15;
                if (next >= 100) {
                    clearInterval(timer);
                    return 100;
                }
                return next;
            });
        }, 100);

        return timer;
    };

    // Trigger on mount AND on pathname change
    useEffect(() => {
        const timer = runAnimation();
        lastPathname.current = pathname;
        return () => clearInterval(timer);
    }, [pathname]);

    useEffect(() => {
        if (progress === 100) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => setShouldRender(false), 500);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [progress]);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
        >
            <div className="text-center space-y-8">
                <div className="flex justify-center mb-2 overflow-visible">
                    <div className="relative w-24 h-24 md:w-32 md:h-32 animate-in fade-in zoom-in duration-700">
                        <img
                            src="/images/megatron-logo.jpg"
                            alt="Megatron Logo"
                            className="w-full h-full object-contain mix-blend-screen filter brightness-110 contrast-125 animate-pulse"
                            style={{ animationDuration: '2s' }}
                        />
                    </div>
                </div>

                <div className="h-20 flex items-center justify-center">
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter animate-breathe">
                        MEGATRON
                    </h1>
                </div>

                <div className="w-64 h-1 bg-gray-900 rounded-full mx-auto overflow-hidden mt-8">
                    <div
                        className="h-full bg-white transition-all duration-200 ease-out shadow-[0_0_10px_white]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
