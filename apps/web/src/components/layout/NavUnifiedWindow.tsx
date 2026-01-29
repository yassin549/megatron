'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, Users, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

type NavTab = 'general' | 'activity' | 'bookmarks' | 'profile';

interface NavUnifiedWindowProps {
    isOpen: boolean;
    activeTab: NavTab | null;
    onClose: () => void;
    children: React.ReactNode;
}

export function NavUnifiedWindow({
    isOpen,
    activeTab,
    onClose,
    children
}: NavUnifiedWindowProps) {
    // Close on Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const getTitle = () => {
        switch (activeTab) {
            case 'general': return 'Menu';
            case 'activity': return 'Activity';
            case 'bookmarks': return 'Watchlist';
            case 'profile': return 'Identity';
            default: return '';
        }
    };

    const getDescription = () => {
        switch (activeTab) {
            case 'general': return 'Navigation';
            case 'activity': return 'Neural Updates';
            case 'bookmarks': return 'Saved Markets';
            case 'profile': return 'Personal Settings';
            default: return '';
        }
    };

    // Calculate position - slightly deferred to ensure we don't clip right edge
    // Fixed position relative to the right edge of the container

    return (
        <AnimatePresence mode="wait">
            {isOpen && activeTab && (
                <div className="absolute right-0 top-full mt-4 z-[100] hidden md:block">
                    <motion.div
                        key="unified-window"
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 400,
                            mass: 0.5
                        }}
                        className="w-[380px] h-[520px] bg-obsidian-900 border border-white/10 rounded-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col nav-popover-content"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex-shrink-0">
                            <div className="flex items-start justify-between">
                                <div>
                                    <motion.h3
                                        key={activeTab + '-title'}
                                        initial={{ opacity: 0, y: 5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="text-xl font-bold text-white tracking-tight"
                                    >
                                        {getTitle()}
                                    </motion.h3>
                                    <motion.p
                                        key={activeTab + '-desc'}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-mono"
                                    >
                                        {getDescription()}
                                    </motion.p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Content Area - Animated Switch */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute inset-0 p-6"
                                >
                                    {children}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Aesthetic Gradient Accents */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 pointer-events-none" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
