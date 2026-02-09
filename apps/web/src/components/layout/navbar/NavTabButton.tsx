'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface NavTabButtonProps {
    icon: LucideIcon;
    isActive: boolean;
    onClick: () => void;
    /** Optional status dot indicator */
    showStatusDot?: boolean;
    /** For profile button - renders avatar instead of icon */
    avatar?: React.ReactNode;
    className?: string;
}

/**
 * Reusable nav tab button with animated underline indicator.
 */
export function NavTabButton({
    icon: Icon,
    isActive,
    onClick,
    showStatusDot,
    avatar,
    className = ''
}: NavTabButtonProps) {
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        onClick();
    };

    // Avatar variant (for profile button)
    if (avatar) {
        return (
            <button
                className={`nav-popover-trigger relative p-0.5 rounded-full transition-all duration-200 group ${isActive
                    ? 'ring-2 ring-primary/20 scale-105'
                    : 'hover:ring-2 hover:ring-white/10'
                    } ${className}`}
                onClick={handleClick}
            >
                {avatar}
                {isActive && (
                    <motion.div
                        layoutId="navbar-tab-indicator"
                        className="absolute -bottom-2 left-0 right-0 h-0.5 bg-brand-primary shadow-[0_0_10px_hsla(var(--brand-primary)/0.5)] mx-2 rounded-full"
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                )}
            </button>
        );
    }

    // Standard icon variant
    return (
        <button
            className={`nav-popover-trigger relative p-2.5 rounded-lg transition-all duration-200 ${isActive ? 'text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                } ${className}`}
            onClick={handleClick}
        >
            <Icon className="relative z-10 w-5 h-5" />

            {/* Status Dot */}
            {showStatusDot && !isActive && (
                <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-status-success rounded-full animate-pulse" />
            )}

            {/* Active Indicator */}
            {isActive && (
                <motion.div
                    layoutId="navbar-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary shadow-[0_0_10px_hsla(var(--brand-primary)/0.5)] mx-2 rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            )}
        </button>
    );
}
