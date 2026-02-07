'use client';

import { motion } from 'framer-motion';
import { ThemePreset, useTheme, THEMES } from '@/context/ThemeContext';
import { Check } from 'lucide-react';

interface ThemeCardProps {
    preset: ThemePreset;
    label: string;
}

export function ThemeCard({ preset, label }: ThemeCardProps) {
    const { theme, setTheme } = useTheme();
    const isActive = theme === preset;
    const colors = THEMES[preset];

    return (
        <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setTheme(preset)}
            className={`relative w-full h-32 rounded-2xl overflow-hidden border-2 transition-all p-1 group ${isActive
                ? 'border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/20'
                : 'border-white/5 hover:border-white/20'
                }`}
        >
            {/* Background Preview */}
            <div
                className="absolute inset-0 z-0"
                style={{ backgroundColor: `hsl(${colors.bgBase})` }}
            />

            {/* Card Content Preview */}
            <div
                className="absolute inset-x-4 bottom-4 top-10 rounded-t-xl z-0 opacity-80"
                style={{ backgroundColor: `hsl(${colors.bgElevated})` }}
            >
                {/* Elements Preview */}
                <div className="p-3 flex gap-2">
                    <div className="w-8 h-8 rounded-full" style={{ backgroundColor: `hsl(${colors.brandPrimary})` }} />
                    <div className="flex-1 space-y-2">
                        <div className="h-2 w-2/3 rounded-full bg-white/20" />
                        <div className="h-2 w-1/3 rounded-full" style={{ backgroundColor: `hsl(${colors.brandAccent})` }} />
                    </div>
                </div>
            </div>

            {/* Label Badge */}
            <div className="absolute top-3 left-3 z-10">
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${isActive
                    ? 'bg-primary text-black border-primary'
                    : 'bg-black/50 text-white border-white/10'
                    }`}>
                    {label}
                </span>
            </div>

            {/* Checkmark */}
            {isActive && (
                <div className="absolute top-3 right-3 z-10 bg-primary/20 p-1 rounded-full">
                    <Check className="w-3.5 h-3.5 text-primary" />
                </div>
            )}

            {/* Hover Glow */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-primary/10 to-transparent pointer-events-none`} />
        </motion.button>
    );
}
