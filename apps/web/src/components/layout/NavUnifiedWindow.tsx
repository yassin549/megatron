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
    userName?: string | null;
}

export function NavUnifiedWindow({
    isOpen,
    activeTab,
    onClose,
    children,
    userName
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
            case 'general': return 'SYSTEM MENU';
            case 'activity': return 'NEURAL UPDATES';
            case 'bookmarks': return 'SAVED MARKETS';
            case 'profile': return userName ? `COMMANDER: ${userName.toUpperCase()}` : 'IDENTITY';
            default: return '';
        }
    };

    const getDescription = () => {
        switch (activeTab) {
            case 'general': return 'Network Navigation';
            case 'activity': return 'Recent Activity Logs';
            case 'bookmarks': return 'Watchlist Variables';
            case 'profile': return 'User Authorization Profile';
            default: return '';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && activeTab && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    {/* Modal Card */}
                    <motion.div
                        key="unified-window"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{
                            type: 'spring',
                            damping: 25,
                            stiffness: 300,
                            mass: 0.8
                        }}
                        className="relative w-full max-w-[850px] h-[650px] max-h-[90vh] glass-modal hud-bracket-corners hud-scanline shadow-[0_0_100px_rgba(59,130,246,0.15)] flex flex-col overflow-hidden"
                    >
                        {/* Glowing Border effect */}
                        <div className="absolute inset-0 border border-primary/20 hud-bracket-corners pointer-events-none" />

                        {/* Content Grid */}
                        <div className="flex flex-col h-full relative z-10">
                            {/* Header */}
                            <div className="p-8 border-b border-white/5 flex items-start justify-between bg-white/[0.02]">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        <p className="text-[10px] text-primary font-mono uppercase tracking-[0.3em] font-bold">
                                            {getDescription()}
                                        </p>
                                    </div>
                                    <motion.h3
                                        key={activeTab + '-title'}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="text-4xl font-black text-white tracking-tighter"
                                    >
                                        {getTitle()}
                                    </motion.h3>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="group relative p-3 rounded-xl border border-white/10 hover:border-primary/50 transition-all hover:bg-primary/10"
                                >
                                    <X className="w-6 h-6 text-zinc-500 group-hover:text-primary transition-colors" />
                                    <div className="absolute -top-1 -right-1 w-2 h-2 border-t border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 flex overflow-hidden">
                                {/* Navigation Sidebar (Desktop) */}
                                <div className="hidden md:flex w-20 flex-col items-center py-8 gap-8 border-r border-white/5 bg-black/20">
                                    <div className="flex flex-col gap-6">
                                        {/* Symbolic indicators or tab switch icons could go here if needed, but keeping it clean for now */}
                                        <div className="w-1 h-12 rounded-full bg-primary/20 relative">
                                            <div className="absolute top-0 left-0 w-full h-1/3 bg-primary rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeTab}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="h-full"
                                        >
                                            {children}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* HUD Footer Information */}
                            <div className="px-8 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                                <div className="flex gap-6">
                                    <span>System: MEGATRON_OS_V1.0</span>
                                    <span>Status: <span className="text-primary">Operational</span></span>
                                </div>
                                <div className="flex gap-6">
                                    <span>Sectors: 24 active</span>
                                    <span>Signal: Stable</span>
                                </div>
                            </div>
                        </div>

                        {/* Aesthetic HUD Corners */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/30 pointer-events-none" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/30 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/30 pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/30 pointer-events-none" />
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
