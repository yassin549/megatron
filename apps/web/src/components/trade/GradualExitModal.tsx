
'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Clock, ArrowRight, Wallet, Info } from 'lucide-react';

interface GradualExitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirmGradual: () => void;
    onConfirmInstant: () => void;
    assetName: string;
    shareAmount: number;
    estimatedValue: number;
    isLoading?: boolean;
}

export function GradualExitModal({
    isOpen,
    onClose,
    onConfirmGradual,
    onConfirmInstant,
    assetName,
    shareAmount,
    estimatedValue,
    isLoading
}: GradualExitModalProps) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
                >
                    {/* Header Header */}
                    <div className="relative p-6 border-b border-white/5 bg-zinc-900/50">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">High Liquidity Impact</span>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Large Position Exit detected</h2>
                        <p className="text-sm text-zinc-400 mt-1">Exiting {shareAmount.toFixed(4)} shares of {assetName} at once may cause significant slippage.</p>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Status Card */}
                        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div>
                                <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Estimated Value</div>
                                <div className="text-lg font-mono font-bold text-emerald-400">${estimatedValue.toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Impact Warning</div>
                                <div className="text-lg font-mono font-bold text-rose-400">{">"} 2.5%</div>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {/* Gradual Option */}
                            <button
                                onClick={onConfirmGradual}
                                disabled={isLoading}
                                className="btn-animated w-full text-left p-4 rounded-2xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all group relative overflow-hidden"
                            >
                                <div className="btn-animated-overlay bg-primary/10" />
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-bold text-white">Gradual Exit (Recommended)</span>
                                            <div className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[8px] font-black tracking-widest uppercase">Zero Slippage Strategy</div>
                                        </div>
                                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                            Exit in 10 chunks over 50 minutes. Maximizes your return by minimizing price impact.
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <ArrowRight className="w-4 h-4 text-primary" />
                                </div>
                            </button>

                            {/* Instant Option */}
                            <button
                                onClick={onConfirmInstant}
                                disabled={isLoading}
                                className="btn-animated w-full text-left p-4 rounded-2xl bg-zinc-800/50 border border-white/5 hover:bg-zinc-800 transition-all group"
                            >
                                <div className="btn-animated-overlay bg-white/10" />
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-700/50 flex items-center justify-center text-zinc-400 group-hover:bg-rose-500/20 group-hover:text-rose-400 transition-colors">
                                        <Wallet className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="text-sm font-bold text-white group-hover:text-rose-400 transition-colors">Instant Exit</span>
                                        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                                            Execute full sell immediately. Subject to current market liquidity and slippage.
                                        </p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Footer Note */}
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/30 text-zinc-500">
                            <Info className="w-4 h-4 flex-shrink-0" />
                            <span className="text-[10px] uppercase font-bold tracking-tight">You can cancel gradual exits at any time from your portfolio.</span>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="p-6 pt-0 flex justify-end">
                        <button
                            onClick={onClose}
                            className="text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                        >
                            Nevermind
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
