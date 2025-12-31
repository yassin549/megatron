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
    Loader2
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
    const [isUpdating, setIsUpdating] = useState(false);
    const [stopLoss, setStopLoss] = useState('');
    const [takeProfit, setTakeProfit] = useState('');
    const router = useRouter();

    const isProfit = position.returnAbs >= 0;
    const isShort = position.shares < 0;

    const handleExit = async () => {
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

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            const slValue = stopLoss ? parseFloat(stopLoss) : null;
            const tpValue = takeProfit ? parseFloat(takeProfit) : null;

            const res = await fetch('/api/trade/position', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: position.assetId, stopLoss: slValue, takeProfit: tpValue }),
            });
            if (res.ok) {
                setIsExpanded(false);
                onActionSuccess?.();
            }
        } catch (err: any) {
            alert('Update failed');
        } finally {
            setIsUpdating(false);
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

                            {/* SL/TP Controls */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-rose-500/70 uppercase tracking-widest flex items-center gap-1.5 px-1">
                                        <Shield className="w-3 h-3" />
                                        Stop Loss
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={stopLoss}
                                        onChange={(e) => setStopLoss(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-rose-500/40 transition-all font-bold"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest flex items-center gap-1.5 px-1">
                                        <Target className="w-3 h-3" />
                                        Take Profit
                                    </label>
                                    <input
                                        type="number"
                                        placeholder="Price"
                                        value={takeProfit}
                                        onChange={(e) => setTakeProfit(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/40 transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleUpdate}
                                    disabled={isUpdating}
                                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                >
                                    {isUpdating ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Update Targets'}
                                </button>
                                <button
                                    onClick={handleExit}
                                    disabled={isExiting}
                                    className="flex-[0.6] py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isExiting ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                                    Exit
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
