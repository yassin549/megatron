import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            screens: {
                'xs': '475px',
            },
            colors: {
                // Base
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",

                // Functional
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },

                // Border/Input
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",

                // Custom "Deep Obsidian" Palette (lightened)
                obsidian: {
                    950: "#0A0E16", // Main background (lightened)
                    900: "#0F1521", // Secondary background (lightened)
                    800: "#1A202E", // Card background (lightened)
                    700: "#252D3E", // Hover state (lightened)
                    600: "#303C52", // Border (lightened)
                },
                neon: {
                    blue: "#3B82F6",    // Core Brand
                    purple: "#8B5CF6",  // Secondary Brand
                    cyan: "#06B6D4",    // Highlights
                    emerald: "#10B981", // Success
                    rose: "#F43F5E",    // Error/Short
                }
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 3px)",
                xl: "calc(var(--radius) * 1.5)",
                "2xl": "calc(var(--radius) * 2)",
                "3xl": "calc(var(--radius) * 3)",
                full: "9999px",
            },
            animation: {
                "accordion-down": "accordion-down 0.15s ease-out",
                "accordion-up": "accordion-up 0.15s ease-out",
                "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "glow": "glow 2s ease-in-out infinite alternate",
                "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
                glow: {
                    "0%": { boxShadow: "0 0 5px rgba(59, 130, 246, 0.5)" },
                    "100%": { boxShadow: "0 0 20px rgba(59, 130, 246, 0.8), 0 0 10px rgba(139, 92, 246, 0.6)" },
                },
                "border-beam": {
                    "100%": {
                        "offset-distance": "100%",
                    },
                },
            },
        },
    },
    plugins: [],
};
export default config;
