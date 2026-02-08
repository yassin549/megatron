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
                // Semantic Tokens
                base: "hsl(var(--bg-base))",
                background: "hsl(var(--bg-base))",
                surface: "hsl(var(--bg-surface))",
                elevated: "hsl(var(--bg-elevated))",
                active: "hsl(var(--bg-active))",

                text: {
                    main: "hsl(var(--text-main))",
                    muted: "hsl(var(--text-muted))",
                    dim: "hsl(var(--text-dim))",
                },

                brand: {
                    primary: "hsl(var(--brand-primary))",
                    accent: "hsl(var(--brand-accent))",
                },

                status: {
                    success: "hsl(var(--status-success))",
                    error: "hsl(var(--status-error))",
                    warning: "hsl(var(--status-warning))",
                    info: "hsl(var(--status-info))",
                },

                // Functional mappings for Shadcn/UI compatibility
                primary: {
                    DEFAULT: "hsl(var(--brand-primary))",
                    foreground: "hsl(var(--bg-base))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--bg-elevated))",
                    foreground: "hsl(var(--text-main))",
                },
                accent: {
                    DEFAULT: "hsl(var(--brand-accent))",
                    foreground: "hsl(var(--text-main))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--status-error))",
                    foreground: "hsl(var(--text-main))",
                },
                muted: {
                    DEFAULT: "hsl(var(--bg-surface))",
                    foreground: "hsl(var(--text-muted))",
                },
                card: {
                    DEFAULT: "hsl(var(--bg-elevated))",
                    foreground: "hsl(var(--text-main))",
                },
                border: "hsl(var(--border-bright))",
                "border-subtle": "hsla(var(--border-subtle))",
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
                "shimmer": "shimmer 2s linear infinite",
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
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
        },
    },
    plugins: [],
};
export default config;
