'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TrendingUp, TrendingDown, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useNotification } from '@/context/NotificationContext';

interface OrderFormProps {
    assetId: string;
    assetPrice: number;
    marketPrice: number;
    assetSymbol: string;
    onTradeSuccess?: () => void;
    onExecutionPriceChange?: (price: number) => void;
    totalSupply?: number;
    pricingParams?: { P0: number; k: number };
}

export function OrderForm({
    assetId,
    assetPrice,
    marketPrice,
    assetSymbol,
    onTradeSuccess,
    onExecutionPriceChange,
    totalSupply,
    pricingParams
}: OrderFormProps) {
    const { data: session, status } = useSession();
    const { showNotification } = useNotification();

    // Local state for balance (similar to UserStats)
    const [balance, setBalance] = useState<number | null>(null);
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch user balance
    useEffect(() => {
        if (status === 'authenticated') {
            const fetchBalance = async () => {
                try {
                    const res = await fetch('/api/user/me');
                    if (res.ok) {
                        const data = await res.json();
                        setBalance(parseFloat(data.walletHotBalance || '0'));
                    }
                } catch (e) {
                    console.error('Failed to fetch balance', e);
                }
            };
            fetchBalance();
        }
    }, [status, isSubmitting]); // Re-fetch after submission

    // Color themes based on side
    const activeColor = side === 'buy' ? 'text-emerald-400' : 'text-rose-400';
    const activeBg = side === 'buy' ? 'bg-emerald-500' : 'bg-rose-500';
    const activeBorder = side === 'buy' ? 'border-emerald-500/50' : 'border-rose-500/50';
    const activeRing = side === 'buy' ? 'focus-within:ring-emerald-500/20' : 'focus-within:ring-rose-500/20';

    // Calculate estimated execution details
    const estimation = useMemo(() => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return null;

        const feeRate = 0.01; // 1% fee mocked
        let estimatedPrice = assetPrice;
        let estimatedQuantity = 0;
        let fee = 0;
        let total = 0;

        if (side === 'buy') {
            estimatedPrice = assetPrice;
            fee = numAmount * feeRate;
            const netAmount = numAmount - fee;
            estimatedQuantity = netAmount / estimatedPrice;
            total = numAmount;
        } else {
            estimatedPrice = assetPrice;
            estimatedQuantity = numAmount;
            const grossReturn = estimatedQuantity * estimatedPrice;
            fee = grossReturn * feeRate;
            total = grossReturn - fee;
        }

        return {
            price: estimatedPrice,
            quantity: estimatedQuantity,
            fee: fee,
            total: total
        };
    }, [amount, side, assetPrice]);

    useEffect(() => {
        if (onExecutionPriceChange && estimation) {
            onExecutionPriceChange(estimation.price);
        }
    }, [estimation, onExecutionPriceChange]);


    const handlePercentageClick = (percent: number) => {
        if (side === 'buy' && balance !== null) {
            setAmount((balance * percent).toFixed(2));
            setError(null);
        } else if (side === 'sell') {
            // For sell side, ideally we'd need user's asset position. 
            // Since we don't have it easily here without more props, disabling or doing nothing for now.
            // Or we could pass 'userPosition' prop to OrderForm.
        }
    };

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Enter a valid amount');
            return;
        }
        if (status !== 'authenticated') {
            showNotification('error', 'Please login to trade');
            return;
        }

        if (side === 'buy' && balance !== null && parseFloat(amount) > balance) {
            setError('Insufficient balance');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    assetId,
                    side,
                    amount: parseFloat(amount)
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Trade failed');
            }

            showNotification('success', 'Trade executed successfully');
            setAmount('');
            if (onTradeSuccess) onTradeSuccess();
            // Refetch balance happens via effect dependency on isSubmitting
        } catch (err: any) {
            setError(err.message);
            showNotification('error', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full relative">

            {/* 1. Header & Tab Switcher */}
            <div className="flex-none p-4 pb-2">
                <div className="bg-black/40 border border-white/5 p-1 rounded-xl flex relative isolate overflow-hidden backdrop-blur-md">
                    <button
                        onClick={() => setSide('buy')}
                        className={`flex-1 py-3 relative z-10 transition-colors duration-300 font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-2 ${side === 'buy' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Buy
                        {side === 'buy' && (
                            <motion.div
                                layoutId="active-tab-bg"
                                className="absolute inset-0 bg-emerald-500/20 border border-emerald-500/30 rounded-lg -z-10 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setSide('sell')}
                        className={`flex-1 py-3 relative z-10 transition-colors duration-300 font-black uppercase tracking-[0.1em] text-xs flex items-center justify-center gap-2 ${side === 'sell' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Sell
                        {side === 'sell' && (
                            <motion.div
                                layoutId="active-tab-bg"
                                className="absolute inset-0 bg-rose-500/20 border border-rose-500/30 rounded-lg -z-10 shadow-[0_0_15px_rgba(244,63,94,0.1)]"
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                </div>
            </div>

            {/* 2. Main Input Area */}
            <div className="flex-1 px-4 flex flex-col gap-4">
                <div className="relative group">
                    <div className={`absolute -inset-0.5 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-md ${side === 'buy' ? 'bg-emerald-500/30' : 'bg-rose-500/30'}`} />
                    <div className={`relative bg-black/60 border ${activeBorder} rounded-2xl p-4 transition-all duration-300 ${activeRing} group-focus-within:ring-1`}>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                Amount ({side === 'buy' ? 'USD' : assetSymbol})
                            </label>
                            <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                                <Wallet className="w-3 h-3" />
                                {status === 'authenticated' ? (
                                    <span>{side === 'buy' ? `$${(balance || 0).toFixed(2)}` : 'Avail: --'}</span>
                                ) : (
                                    <span>--</span>
                                )}
                            </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError(null);
                                }}
                                placeholder="0.00"
                                className="w-full bg-transparent text-3xl font-black text-white placeholder-zinc-700 outline-none tabular-nums caret-zinc-400"
                            />
                        </div>

                        {/* Percentages - Only valid known balance for BUY currently */}
                        {side === 'buy' && (
                            <div className="flex gap-2 mt-3">
                                {[0.25, 0.5, 0.75, 1].map((pct) => (
                                    <button
                                        key={pct}
                                        onClick={() => handlePercentageClick(pct)}
                                        className="flex-1 py-1 text-[9px] font-bold text-zinc-500 bg-white/5 hover:bg-white/10 hover:text-white rounded-lg transition-colors border border-white/5 uppercase tracking-wider"
                                    >
                                        {pct * 100}%
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Transaction Details & Error */}
                <div className="flex-1 min-h-[100px]">
                    <AnimatePresence mode="wait">
                        {error ? (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-3"
                            >
                                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                <p className="text-xs text-rose-200 font-medium leading-relaxed">{error}</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="summary"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3 p-2"
                            >
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-zinc-500 font-medium">Price Impact</span>
                                    <span className="text-white font-mono">~0.1%</span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-zinc-500 font-medium">Est. Price</span>
                                    <span className="text-white font-mono">${assetPrice.toFixed(2)}</span>
                                </div>
                                <div className="h-px bg-white/5 my-2" />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">Total</span>
                                    <div className="text-right">
                                        <div className={`text-lg font-black tabular-nums ${activeColor}`}>
                                            {side === 'buy'
                                                ? estimation ? estimation.quantity.toFixed(4) : '0.0000'
                                                : estimation ? `$${estimation.total.toFixed(2)}` : '$0.00'
                                            }
                                            <span className="text-[10px] text-zinc-500 ml-1">
                                                {side === 'buy' ? assetSymbol : 'USD'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* 4. Action Button - Fixed at Bottom */}
            <div className="p-4 mt-auto">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || (side === 'buy' && !amount)}
                    className="w-full relative group h-14 rounded-2xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                    <div className={`absolute inset-0 ${activeBg} opacity-80 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000`} />

                    <div className="relative h-full flex items-center justify-center gap-2">
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                            <>
                                <span className="text-white font-black uppercase tracking-[0.2em] text-sm">
                                    {side === 'buy' ? 'Buy Now' : 'Sell Now'}
                                </span>
                                {side === 'buy' ? (
                                    <TrendingUp className="w-4 h-4 text-white/80" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-white/80" />
                                )}
                            </>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
}
