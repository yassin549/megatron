'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    TrendingUp,
    TrendingDown,
    LogOut,
    Shield,
    Target,
    ArrowUpRight,
    Loader2,
    Check
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Position {
    assetId: string;
    assetName: string;
    shares: number;
    avgPrice: number;
    currentPrice: number;
    value: number;
    returnPercent: number;
    returnAbs: number;
    stopLoss?: number | null;
    takeProfit?: number | null;
}

interface CompactPositionItemProps {
    position: Position;
    isCurrentAsset: boolean;
    isSelected: boolean;
    onSelect: () => void;
    onActionSuccess?: () => void;
}

export function CompactPositionItem({
    position,
    isCurrentAsset,
    isSelected,
    onSelect,
    onActionSuccess
}: CompactPositionItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [updatingTarget, setUpdatingTarget] = useState<'sl' | 'tp' | null>(null);
    const router = useRouter();

    const isProfit = position.returnAbs >= 0;
    const isShort = position.shares < 0;

    const handleExit = async () => {
        if (!position.shares || Math.abs(position.shares) < 0.000001) {
            alert("No active position to exit.");
            return;
        }
        setIsExiting(true);
        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: isShort ? 'buy' : 'sell',
                    assetId: position.assetId,
                    shares: Math.abs(position.shares).toString()
                }),
            });
            if (res.ok) {
                onActionSuccess?.();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Exit failed');
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setIsExiting(false);
        }
    };

    const toggleTarget = async (type: 'sl' | 'tp') => {
        setUpdatingTarget(type);
        try {
            const currentVal = type === 'sl' ? position.stopLoss : position.takeProfit;
            let newVal = null;

            if (!currentVal) {
                // Set Default
                // TP: +10% for Long, -10% for Short
                // SL: -5% for Long, +5% for Short
                const entry = position.avgPrice;
                if (type === 'tp') {
                    newVal = isShort ? entry * 0.9 : entry * 1.1;
                } else {
                    newVal = isShort ? entry * 1.05 : entry * 0.95;
                }
                newVal = Number(newVal.toFixed(2));
            }

            const res = await fetch('/api/trade/position', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId: position.assetId,
                    stopLoss: type === 'sl' ? newVal : undefined,
                    takeProfit: type === 'tp' ? newVal : undefined
                }),
            });

            if (res.ok) {
                onActionSuccess?.();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setUpdatingTarget(null);
        }
    };

    const handleClick = () => {
        if (!isCurrentAsset) {
            router.push(`/assets/${position.assetId}`);
        } else {
            setIsExpanded(!isExpanded);
            onSelect();
        }
    };

    const hasSL = !!position.stopLoss;
    const hasTP = !!position.takeProfit;

    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${isSelected
                ? 'border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                : 'border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60 hover:border-white/10'
                }`}
        >
            <button
                onClick={handleClick}
                className="w-full p-4 flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isProfit
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                        {isProfit ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                {position.assetName}
                            </span>
                            {/* SIDE BADGE */}
                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isShort
                                    ? 'bg-rose-500/20 text-rose-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}>
                                {isShort ? 'SELL' : 'BUY'}
                            </span>
                            {isCurrentAsset && (
                                <span className="text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 bg-primary/20 text-primary rounded-md">
                                    Current
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-mono font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isProfit ? '+' : ''}{position.returnPercent.toFixed(2)}%
                            </span>
                            <span className="text-[10px] text-zinc-600 font-mono">•</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                                ${position.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="text-right hidden sm:block">
                        <div className={`text-xs font-mono font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${position.returnAbs.toFixed(2)}
                        </div>
                        <div className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">
                            Net Return
                        </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-zinc-600 group-hover:text-white transition-all ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
            </button>

            <AnimatePresence>
                {isExpanded && isCurrentAsset && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5 bg-black/20"
                    >
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Entry Price</div>
                                    <div className="text-sm font-mono font-bold text-white">${position.avgPrice.toFixed(2)}</div>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Position Size</div>
                                    <div className="text-sm font-mono font-bold text-white">{Math.abs(position.shares).toFixed(2)} Shares</div>
                                </div>
                            </div>

                            {/* Checklist Style Buttons */}
                            <div className="space-y-2">
                                <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest px-1">
                                    Risk Management
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Stop Loss Button */}
                                    <button
                                        onClick={() => toggleTarget('sl')}
                                        disabled={updatingTarget === 'sl'}
                                        className={`relative group flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${hasSL
                                                ? 'bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                                                : 'bg-zinc-900/40 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${hasSL ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <Shield className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="text-left">
                                                <div className={`text-[10px] font-black uppercase tracking-wider ${hasSL ? 'text-rose-400' : 'text-zinc-500'}`}>
                                                    Stop Loss
                                                </div>
                                                {hasSL && (
                                                    <div className="text-xs font-mono font-bold text-white">
                                                        ${position.stopLoss}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {updatingTarget === 'sl' ? (
                                            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                                        ) : (
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${hasSL
                                                    ? 'bg-rose-500 border-rose-500 text-white'
                                                    : 'border-zinc-700 group-hover:border-zinc-500'
                                                }`}>
                                                {hasSL && <Check className="w-3 h-3" />}
                                                {!hasSL && <div className="w-2 h-2 rounded-full bg-zinc-800 group-hover:bg-zinc-600 transition-colors" />}
                                            </div>
                                        )}
                                    </button>

                                    {/* Take Profit Button */}
                                    <button
                                        onClick={() => toggleTarget('tp')}
                                        disabled={updatingTarget === 'tp'}
                                        className={`relative group flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${hasTP
                                                ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.1)]'
                                                : 'bg-zinc-900/40 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800/40'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${hasTP ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                                                <Target className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="text-left">
                                                <div className={`text-[10px] font-black uppercase tracking-wider ${hasTP ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                                    Take Profit
                                                </div>
                                                {hasTP && (
                                                    <div className="text-xs font-mono font-bold text-white">
                                                        ${position.takeProfit}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {updatingTarget === 'tp' ? (
                                            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                                        ) : (
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${hasTP
                                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                                    : 'border-zinc-700 group-hover:border-zinc-500'
                                                }`}>
                                                {hasTP && <Check className="w-3 h-3" />}
                                                {!hasTP && <div className="w-2 h-2 rounded-full bg-zinc-800 group-hover:bg-zinc-600 transition-colors" />}
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={handleExit}
                                disabled={isExiting}
                                className="w-full py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isExiting ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                                Close Position
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
