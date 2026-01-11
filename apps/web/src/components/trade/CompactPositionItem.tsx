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
import { useRouter } from 'next/navigation';
import { useNotification } from '@/context/NotificationContext';

import { GradualExitModal } from './GradualExitModal';
import { MONETARY_CONFIG } from '@megatron/lib-common';

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
        if (!isCurrentAsset) {
            router.push(`/assets/${position.assetId}`);
        } else {
            setIsExpanded(!isExpanded);
            onSelect();
        }
    };

    const exitProgress = timedExit ? (timedExit.chunksCompleted / timedExit.chunksTotal) * 100 : 0;

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
                            <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${isShort
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                {isShort ? 'Sell' : 'Buy'}
                            </span>
                            {timedExit && (
                                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-md animate-pulse">
                                    Exiting ({timedExit.chunksCompleted}/{timedExit.chunksTotal})
                                </span>
                            )}
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

                <div className="flex items-center gap-4">
                    {/* Visual Indicators (Checklist) */}
                    <div className="flex items-center gap-1.5 p-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${position.stopLoss ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' : 'bg-zinc-800'}`} />
                        <div className={`w-1.5 h-1.5 rounded-full ${position.takeProfit ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-zinc-800'}`} />
                    </div>

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

            {timedExit && (
                <div className="px-4 pb-4">
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${exitProgress}%` }}
                            className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                        />
                    </div>
                </div>
            )}

            <AnimatePresence>
                {isExpanded && isCurrentAsset && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5 bg-black/20"
                    >
                        <div className="p-4 space-y-4">
                            {/* Grid Data */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Entry</div>
                                    <div className="text-xs font-mono font-bold text-white">${position.avgPrice.toFixed(2)}</div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Size</div>
                                    <div className="text-xs font-mono font-bold text-white">${position.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">TP</div>
                                    <div className={`text-xs font-mono font-bold ${position.takeProfit ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                        {position.takeProfit ? `$${position.takeProfit.toFixed(2)}` : 'None'}
                                    </div>
                                </div>
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                                    <div className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">SL</div>
                                    <div className={`text-xs font-mono font-bold ${position.stopLoss ? 'text-rose-400' : 'text-zinc-600'}`}>
                                        {position.stopLoss ? `$${position.stopLoss.toFixed(2)}` : 'None'}
                                    </div>
                                </div>
                            </div>

                            {timedExit ? (
                                <button
                                    onClick={handleCancelExit}
                                    disabled={isCancelling}
                                    className="w-full py-3 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isCancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-4 h-4" />}
                                    CANCEL GRADUAL EXIT
                                </button>
                            ) : (
                                <button
                                    onClick={() => handleExit()}
                                    disabled={isExiting}
                                    className="w-full py-3 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-rose-900/10"
                                >
                                    {isExiting ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                    EXIT POSITION
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
