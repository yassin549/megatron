'use client';

import { useState, useEffect } from 'react';
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
    X
} from 'lucide-react';
import Link from 'next/link';
import { useNotification } from '@/context/NotificationContext';

import { GradualExitModal } from './GradualExitModal';

import { MONETARY_CONFIG } from '@megatron/lib-common';

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

interface TimedExit {
    id: string;
    assetId: string;
    totalShares: number;
    sharesExited: number;
    chunksTotal: number;
    chunksCompleted: number;
    status: string;
}

interface CompactPositionItemProps {
    position: Position;
    timedExit?: TimedExit;
    isCurrentAsset: boolean;
    isSelected: boolean;
    onSelect: () => void;
    onActionSuccess?: () => void;
}

export function CompactPositionItem({
    position,
    timedExit,
    isCurrentAsset,
    isSelected,
    onSelect,
    onActionSuccess
}: CompactPositionItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [showGradualModal, setShowGradualModal] = useState(false);
    const [stopLoss, setStopLoss] = useState(position.stopLoss?.toString() || '');
    const [takeProfit, setTakeProfit] = useState(position.takeProfit?.toString() || '');

    // Sync with props
    useEffect(() => {
        setStopLoss(position.stopLoss?.toString() || '');
        setTakeProfit(position.takeProfit?.toString() || '');
    }, [position.stopLoss, position.takeProfit]);
    const router = useRouter();

    const isProfit = position.returnAbs >= 0;
    const isShort = position.shares < 0;

    const { showNotification, showStatusModal } = useNotification();

    const handleExit = async (isGradualOverride = false) => {
        if (!position.shares || Math.abs(position.shares) < 0.000001) {
            showNotification('info', "No active position to exit.");
            return;
        }

        // --- LIQUIDITY CHECK FOR GRADUAL EXIT ---
        if (!isGradualOverride && !isShort) { // Only recommend for large long sells for now
            try {
                const assetRes = await fetch(`/api/assets/${position.assetId}`);
                if (assetRes.ok) {
                    const assetData = await assetRes.json();
                    const poolLiquidity = assetData.asset?.pool?.liquidityUsdc || 0;
                    const exitValue = position.value;
                    const impactRatio = exitValue / poolLiquidity;

                    if (impactRatio > MONETARY_CONFIG.MAX_INSTANT_EXIT_POOL_RATIO) {
                        setShowGradualModal(true);
                        return;
                    }
                }
            } catch (err) {
                console.error('Failed to check liquidity', err);
            }
        }

        setIsExiting(true);
        setShowGradualModal(false);
        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: isShort ? 'buy' : 'sell',
                    assetId: position.assetId,
                    shares: Math.abs(position.shares).toString(),
                    isGradual: isGradualOverride,
                    chunks: 10
                }),
            });
            if (res.ok) {
                await onActionSuccess?.();
                showStatusModal({
                    type: 'success',
                    title: isGradualOverride ? 'GRADUAL EXIT STARTED' : 'EXIT SUCCESS',
                    message: isGradualOverride
                        ? `Position in ${position.assetName} will be closed over 50 minutes.`
                        : `Position in ${position.assetName} closed.`
                });
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Exit failed');
            }
        } catch (err: any) {
            showStatusModal({
                type: 'error',
                title: 'EXIT FAILED',
                message: err.message
            });
        } finally {
            setIsExiting(false);
        }
    };

    const handleCancelExit = async () => {
        if (!timedExit) return;
        setIsCancelling(true);
        try {
            const res = await fetch('/api/trade/timed-exit/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timedExitId: timedExit.id }),
            });
            if (res.ok) {
                await onActionSuccess?.();
                showNotification('success', 'Gradual exit cancelled');
            }
        } catch (err) {
            console.error('Failed to cancel exit', err);
        } finally {
            setIsCancelling(false);
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
                await onActionSuccess?.();
                showNotification('success', 'Targets updated');
            }
        } catch (err: any) {
            showNotification('error', 'Update failed');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelTarget = async (type: 'stopLoss' | 'takeProfit') => {
        try {
            const res = await fetch('/api/trade/position', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId: position.assetId,
                    [type]: null
                }),
            });
            if (res.ok) {
                await onActionSuccess?.();
            }
        } catch (err) {
            console.error('Failed to cancel target', err);
        }
    };

    const handleClick = () => {
        setIsExpanded(!isExpanded);
        onSelect();
    };


    const exitProgress = timedExit ? (timedExit.chunksCompleted / timedExit.chunksTotal) * 100 : 0;

    return (
        <div
            className={`group relative overflow-hidden rounded-[4px] border transition-all duration-300 ${isSelected
                ? 'border-primary/50 bg-primary/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                : 'border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60 hover:border-white/10'
                }`}
        >
            <button
                onClick={handleClick}
                className="w-full p-3 flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-[4px] flex items-center justify-center border ${isProfit
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}>
                        {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white group-hover:text-primary transition-colors uppercase tracking-tight">
                                {position.assetName}
                            </span>
                            <span className={`text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded-sm ${isShort
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                {isShort ? 'SHORT' : 'LONG'}
                            </span>
                            {timedExit && (
                                <span className="text-[7px] font-black uppercase tracking-widest px-1 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-sm animate-pulse">
                                    EXIT_PROGRESS ({timedExit.chunksCompleted}/{timedExit.chunksTotal})
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-mono font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isProfit ? '+' : ''}{Number(position.returnPercent || 0).toFixed(2)}%
                            </span>
                            <span className="text-[10px] text-zinc-800 font-mono">/</span>
                            <span className="text-[10px] text-zinc-500 font-mono font-bold tracking-tighter">
                                ${Number(position.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Visual Indicators (Instrument Checklist) */}
                    <div className="flex items-center gap-1 p-0.5">
                        <div className={`w-1 h-3 rounded-full ${position.stopLoss ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-zinc-800'}`} />
                        <div className={`w-1 h-3 rounded-full ${position.takeProfit ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'}`} />
                    </div>

                    <div className="text-right hidden sm:block">
                        <div className={`text-[11px] font-mono font-black ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isProfit ? '+' : ''}${Number(position.returnAbs || 0).toFixed(1)}
                        </div>
                        <div className="text-[7px] text-zinc-600 font-black uppercase tracking-[0.2em] leading-none mt-0.5">
                            NET_PnL
                        </div>
                    </div>
                    <ChevronRight className={`w-3 h-3 text-zinc-700 group-hover:text-white transition-all ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
            </button>

            {timedExit && (
                <div className="px-3 pb-3">
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${exitProgress}%` }}
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                        />
                    </div>
                </div>
            )}

            <AnimatePresence>
                {isExpanded && (

                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5 bg-black/40"
                    >
                        <div className="p-3 space-y-3">
                            {/* Grid Data - Technical View */}
                            <div className="grid grid-cols-4 gap-1.5">
                                <div className="p-2 rounded-md bg-white/[0.02] border border-white/5">
                                    <div className="text-[7px] text-zinc-600 font-black uppercase tracking-widest mb-0.5">Entry</div>
                                    <div className="text-[10px] font-mono font-black text-white">${Number(position.avgPrice || 0).toFixed(2)}</div>
                                </div>
                                <div className="p-2 rounded-md bg-white/[0.02] border border-white/5">
                                    <div className="text-[7px] text-zinc-600 font-black uppercase tracking-widest mb-0.5">Size</div>
                                    <div className="text-[10px] font-mono font-black text-white">${Number(position.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div className="p-2 rounded-md bg-white/[0.02] border border-white/5">
                                    <div className="text-[7px] text-zinc-600 font-black uppercase tracking-widest mb-0.5">TP</div>
                                    <div className={`text-[10px] font-mono font-black ${position.takeProfit ? 'text-emerald-400' : 'text-zinc-800'}`}>
                                        {position.takeProfit ? `$${Number(position.takeProfit).toFixed(2)}` : 'OFF'}
                                    </div>
                                </div>
                                <div className="p-2 rounded-md bg-white/[0.02] border border-white/5">
                                    <div className="text-[7px] text-zinc-600 font-black uppercase tracking-widest mb-0.5">SL</div>
                                    <div className={`text-[10px] font-mono font-black ${position.stopLoss ? 'text-rose-400' : 'text-zinc-800'}`}>
                                        {position.stopLoss ? `$${Number(position.stopLoss).toFixed(2)}` : 'OFF'}
                                    </div>
                                </div>
                            </div>

                            {timedExit ? (
                                <button
                                    onClick={handleCancelExit}
                                    disabled={isCancelling}
                                    className="w-full py-2.5 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    CANCEL_GRADUAL_EXIT
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleExit()}
                                    disabled={isExiting}
                                    className="w-full py-2.5 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-md text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_0_20px_rgba(244,63,94,0.05)]"
                                >
                                    {isExiting ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                                    EXIT_POSITION_INSTANT
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {/* Gradual Exit Slippage Warning Modal */}
            <GradualExitModal
                isOpen={showGradualModal}
                onClose={() => setShowGradualModal(false)}
                onConfirmGradual={() => handleExit(true)}
                onConfirmInstant={() => handleExit(false)}
                assetName={position.assetName}
                shareAmount={Math.abs(position.shares)}
                estimatedValue={position.value}
                isLoading={isExiting}
            />
        </div>
    );
}
