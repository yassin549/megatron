'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';
import { useEffect } from 'react';

interface NavMegaCardProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    icon?: LucideIcon;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export function NavMegaCard({
    isOpen,
    onClose,
    title,
    description,
    icon: Icon,
    children,
    footer
}: NavMegaCardProps) {
    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="absolute right-0 top-full mt-4 z-[100] hidden lg:block">
                    {/* Snappy Animation */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 400, // Very snappy
                            mass: 0.5
                        }}
                        className="w-[380px] h-[520px] bg-obsidian-900 border border-white/10 rounded-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col nav-popover-content"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    {Icon && (
                                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                            <Icon className="w-6 h-6 text-primary" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                                        {description && (
                                            <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-mono">
                                                {description}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                            {children}
                        </div>

                        {/* Footer */}
                        {footer && (
                            <div className="p-4 bg-white/[0.01] border-t border-white/5">
                                {footer}
                            </div>
                        )}

                        {/* Aesthetic Gradient Accents */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
