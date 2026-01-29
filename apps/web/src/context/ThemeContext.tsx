'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreset = 'default' | 'ocean' | 'neon' | 'crimson' | 'sunset';

interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    card: string;
}

export const THEMES: Record<ThemePreset, ThemeColors> = {
    default: {
        primary: '217 91% 60%',    // Electric Blue
        secondary: '217 33% 15%',
        accent: '270 100% 60%',    // Neon Purple
        background: '222 47% 4%',
        card: '222 47% 7%',
    },
    ocean: {
        primary: '190 90% 50%',    // Cyan
        secondary: '195 30% 15%',
        accent: '220 90% 60%',     // Blue
        background: '200 50% 3%',
        card: '200 50% 6%',
    },
    neon: {
        primary: '320 100% 55%',   // Hot Pink
        secondary: '280 30% 15%',
        accent: '180 100% 50%',    // Cyan
        background: '280 40% 4%',
        card: '280 40% 7%',
    },
    crimson: {
        primary: '345 90% 55%',    // Red
        secondary: '0 30% 12%',
        accent: '30 90% 55%',      // Orange
        background: '0 40% 3%',
        card: '0 40% 6%',
    },
    sunset: {
        primary: '25 95% 55%',     // Orange
        secondary: '20 30% 15%',
        accent: '280 80% 60%',     // Purple
        background: '20 40% 4%',
        card: '20 40% 7%',
    }
};

interface ThemeContextType {
    theme: ThemePreset;
    setTheme: (theme: ThemePreset) => void;
    activeColors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemePreset>('default');
    const [mounted, setMounted] = useState(false);

    // Initial Load
    useEffect(() => {
        const savedTheme = localStorage.getItem('megatron-theme') as ThemePreset;
        if (savedTheme && THEMES[savedTheme]) {
            setThemeState(savedTheme);
            applyTheme(savedTheme);
        }
        setMounted(true);
    }, []);

    const applyTheme = (newTheme: ThemePreset) => {
        const colors = THEMES[newTheme];
        const root = document.documentElement;

        root.style.setProperty('--primary', colors.primary);
        root.style.setProperty('--secondary', colors.secondary);
        root.style.setProperty('--accent', colors.accent);
        root.style.setProperty('--background', colors.background);
        root.style.setProperty('--card', colors.card);

        // Also update background gradients if needed (optional advanced feature)
    };

    const setTheme = (newTheme: ThemePreset) => {
        setThemeState(newTheme);
        localStorage.setItem('megatron-theme', newTheme);
        applyTheme(newTheme);
    };

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, activeColors: THEMES[theme] }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
