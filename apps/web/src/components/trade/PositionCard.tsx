'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, TrendingUp, TrendingDown, LogOut, Shield, Target } from 'lucide-react';

interface PositionCardProps {
    shares: number;
    avgPrice: number;
    currentPrice: number;
    stopLoss: string;
    takeProfit: string;
    onStopLossChange: (val: string) => void;
    onTakeProfitChange: (val: string) => void;
    onUpdateTargets: () => void;
    onExitPosition: () => void;
    isUpdating?: boolean;
    isExiting?: boolean;
    collateral?: number;
}

export function PositionCard({
    shares,
    avgPrice,
    currentPrice,
    stopLoss,
    takeProfit,
    onStopLossChange,
    onTakeProfitChange,
    onUpdateTargets,
    onExitPosition,
    isUpdating = false,
    isExiting = false,
    collateral = 0,
}: PositionCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate P/L
    const pnl = (currentPrice - avgPrice) * shares;
    const pnlPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
    const isProfit = pnl >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-white/5 rounded-xl overflow-hidden backdrop-blur-xl shadow-lg"
        >
            {/* Collapsed Header - Always Visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                        {isProfit ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-rose-400" />
                        )}
                    </div>
                    <div className="text-left">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Position P/L</div>
                        <div className={`text-sm font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
                        </div>
                    </div>
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                </motion.div>
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                            {/* Position Stats */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${shares > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {shares > 0 ? 'Long' : 'Short'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                                <div className="bg-black/30 rounded-lg p-3">
                                    <div className="text-zinc-500 uppercase tracking-wider mb-1">Size</div>
                                    <div className="text-white font-bold">{Math.abs(shares).toFixed(4)}</div>
                                </div>
                                <div className="bg-black/30 rounded-lg p-3">
                                    <div className="text-zinc-500 uppercase tracking-wider mb-1">Entry</div>
                                    <div className="text-white font-bold">${avgPrice.toFixed(2)}</div>
                                </div>
                                {shares < 0 && (
                                    <div className="bg-black/30 rounded-lg p-3 col-span-2">
                                        <div className="text-zinc-500 uppercase tracking-wider mb-1">Total Collateral</div>
                                        <div className="text-white font-bold font-mono">${collateral.toFixed(2)} <span className="text-[8px] text-zinc-500 uppercase">(Locked)</span></div>
                                    </div>
                                )}
                            </div>

                            {/* SL/TP Inputs */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-rose-500/70 uppercase tracking-widest flex items-center gap-1.5 px-1">
                                        <Shield className="w-2.5 h-2.5" />
                                        Stop Loss
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={stopLoss}
                                        onChange={(e) => onStopLossChange(e.target.value)}
                                        placeholder="Price"
                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-rose-500/40 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-widest flex items-center gap-1.5 px-1">
                                        <Target className="w-2.5 h-2.5" />
                                        Take Profit
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={takeProfit}
                                        onChange={(e) => onTakeProfitChange(e.target.value)}
                                        placeholder="Price"
                                        className="w-full bg-black/40 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/40 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={onUpdateTargets}
                                    disabled={isUpdating}
                                    className="flex-1 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUpdating ? 'Saving...' : 'Update'}
                                </button>
                                <button
                                    onClick={onExitPosition}
                                    disabled={isExiting}
                                    className="flex-1 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <LogOut className="w-3 h-3" />
                                    {isExiting ? 'Exiting...' : 'Exit'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
