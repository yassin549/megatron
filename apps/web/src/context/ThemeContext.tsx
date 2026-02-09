'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreset = 'default' | 'ocean' | 'neon' | 'crimson' | 'sunset';

interface ThemeColors {
    bgBase: string;
    bgSurface: string;
    bgElevated: string;
    bgActive: string;
    textMain: string;
    textMuted: string;
    textDim: string;
    brandPrimary: string;
    brandAccent: string;
    statusSuccess: string;
    statusError: string;
    borderSubtle: string;
    borderBright: string;
}

export const THEMES: Record<ThemePreset, ThemeColors> = {
    default: {
        bgBase: '222 47% 10%',
        bgSurface: '222 47% 12%',
        bgElevated: '222 47% 16%',
        bgActive: '222 47% 20%',
        textMain: '210 40% 98%',
        textMuted: '215 20% 70%',
        textDim: '215 15% 50%',
        brandPrimary: '217 91% 60%',
        brandAccent: '270 100% 66%',
        statusSuccess: '160 84% 39%',
        statusError: '345 80% 50%',
        borderSubtle: '217 33% 16%',
        borderBright: '217 33% 24%',
    },
    ocean: {
        bgBase: '200 50% 8%',
        bgSurface: '200 50% 10%',
        bgElevated: '200 50% 14%',
        bgActive: '200 50% 18%',
        textMain: '180 20% 98%',
        textMuted: '190 20% 70%',
        textDim: '190 15% 50%',
        brandPrimary: '190 90% 50%',
        brandAccent: '210 90% 60%',
        statusSuccess: '160 84% 39%',
        statusError: '0 80% 60%',
        borderSubtle: '200 30% 14%',
        borderBright: '200 30% 22%',
    },
    neon: {
        bgBase: '280 40% 8%',
        bgSurface: '280 40% 10%',
        bgElevated: '280 40% 14%',
        bgActive: '280 40% 18%',
        textMain: '280 10% 98%',
        textMuted: '280 10% 70%',
        textDim: '280 10% 50%',
        brandPrimary: '320 100% 60%',
        brandAccent: '180 100% 50%',
        statusSuccess: '150 100% 50%',
        statusError: '330 100% 60%',
        borderSubtle: '280 30% 14%',
        borderBright: '280 30% 22%',
    },
    crimson: {
        bgBase: '0 40% 8%',
        bgSurface: '0 40% 10%',
        bgElevated: '0 40% 14%',
        bgActive: '0 40% 18%',
        textMain: '0 10% 98%',
        textMuted: '0 10% 70%',
        textDim: '0 10% 50%',
        brandPrimary: '345 90% 55%',
        brandAccent: '25 95% 55%',
        statusSuccess: '140 80% 50%',
        statusError: '345 100% 50%',
        borderSubtle: '0 30% 14%',
        borderBright: '0 30% 22%',
    },
    sunset: {
        bgBase: '20 40% 8%',
        bgSurface: '20 40% 10%',
        bgElevated: '20 40% 14%',
        bgActive: '20 40% 18%',
        textMain: '20 10% 98%',
        textMuted: '20 10% 70%',
        textDim: '20 10% 50%',
        brandPrimary: '25 95% 55%',
        brandAccent: '280 80% 60%',
        statusSuccess: '150 80% 50%',
        statusError: '0 80% 60%',
        borderSubtle: '20 30% 14%',
        borderBright: '20 30% 22%',
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
        } else {
            applyTheme('default');
        }
        setMounted(true);
    }, []);

    const applyTheme = (newTheme: ThemePreset) => {
        const colors = THEMES[newTheme];
        const root = document.documentElement;

        // Base Layer
        root.style.setProperty('--bg-base', colors.bgBase);
        root.style.setProperty('--bg-surface', colors.bgSurface);
        root.style.setProperty('--bg-elevated', colors.bgElevated);
        root.style.setProperty('--bg-active', colors.bgActive);

        // Text
        root.style.setProperty('--text-main', colors.textMain);
        root.style.setProperty('--text-muted', colors.textMuted);
        root.style.setProperty('--text-dim', colors.textDim);

        // Brand
        root.style.setProperty('--brand-primary', colors.brandPrimary);
        root.style.setProperty('--brand-accent', colors.brandAccent);

        // Status
        root.style.setProperty('--status-success', colors.statusSuccess);
        root.style.setProperty('--status-error', colors.statusError);

        // Borders
        root.style.setProperty('--border-subtle', colors.borderSubtle);
        root.style.setProperty('--border-bright', colors.borderBright);

        // Legacy Mappings for compatibility
        root.style.setProperty('--background', colors.bgSurface);
        root.style.setProperty('--foreground', colors.textMain);
        root.style.setProperty('--primary', colors.brandPrimary);
        root.style.setProperty('--accent', colors.brandAccent);
        root.style.setProperty('--card', colors.bgElevated);
        root.style.setProperty('--border', colors.borderBright);
    };

    const setTheme = (newTheme: ThemePreset) => {
        setThemeState(newTheme);
        localStorage.setItem('megatron-theme', newTheme);
        applyTheme(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, activeColors: THEMES[theme] }}>
            {/* Prevent hydration mismatch for components using theme directly, but provide context always */}
            {mounted ? children : <div style={{ visibility: 'hidden' }}>{children}</div>}
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
