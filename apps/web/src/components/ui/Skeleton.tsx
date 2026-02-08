'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    /** Shape variant - affects border radius */
    variant?: 'rectangle' | 'circle' | 'text';
}

/**
 * YouTube-style skeleton component with smooth shimmer animation.
 * Uses a left-to-right gradient sweep for a premium loading effect.
 */
export function Skeleton({ className, variant = 'rectangle' }: SkeletonProps) {
    const variantClasses = {
        rectangle: 'rounded-lg',
        circle: 'rounded-full',
        text: 'rounded h-4 w-full',
    };

    return (
        <div
            className={cn(
                // Base skeleton styles
                'relative overflow-hidden bg-surface',
                // Shimmer gradient
                'before:absolute before:inset-0',
                'before:bg-gradient-to-r before:from-transparent before:via-elevated before:to-transparent',
                'before:bg-[length:200%_100%]',
                'before:animate-shimmer',
                // Variant styles
                variantClasses[variant],
                className
            )}
        />
    );
}

/**
 * Text skeleton with multiple lines
 */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="text"
                    className={cn(
                        'h-3',
                        i === lines - 1 ? 'w-3/4' : 'w-full' // Last line shorter
                    )}
                />
            ))}
        </div>
    );
}
