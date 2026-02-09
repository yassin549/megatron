'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, TrendingUp, TrendingDown, Wallet, AlertCircle, RefreshCw, Settings2 } from 'lucide-react';
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

    // State
    const [balance, setBalance] = useState<number | null>(null);
    const [side, setSide] = useState<'buy' | 'sell'>('buy');
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [amount, setAmount] = useState('');

    // Limit Order State
    const [limitPrice, setLimitPrice] = useState('');
    const [takeProfit, setTakeProfit] = useState('');
    const [stopLoss, setStopLoss] = useState('');

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
    }, [status, isSubmitting]);

    // Pre-fill limit price with current price when switching to limit
    useEffect(() => {
        if (orderType === 'limit' && !limitPrice) {
            setLimitPrice(assetPrice.toFixed(2));
        }
    }, [orderType, assetPrice]);

    // Color themes based on side
    const activeColor = side === 'buy' ? 'text-emerald-400' : 'text-rose-400';
    const activeBg = side === 'buy' ? 'bg-emerald-500' : 'bg-rose-500';
    const btnGradient = side === 'buy'
        ? 'from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400'
        : 'from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400';

    // Calculate estimated execution details
    const estimation = useMemo(() => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return null;

        const effectivePrice = orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : assetPrice;
        const feeRate = 0.01; // 1% fee mocked
        let estimatedQuantity = 0;
        let fee = 0;
        let total = 0;

        if (side === 'buy') {
            // For Buy: Amount is in USD (Input) -> Convert to Shares
            fee = numAmount * feeRate;
            const netAmount = numAmount - fee;
            estimatedQuantity = netAmount / effectivePrice;
            total = numAmount;
        } else {
            // For Sell: Input is Shares (usually) or USD value?
            // Assuming Input is Shares for Sell in this simple view, OR we keep "Amount" as USD value for simplicity
            // Let's stick to USD Value for input to keep UI unified as "Amount (USD)"
            // Logic: User wants to sell $X worth of assets

            // Standardizing: Input is ALWAYS USD Value for this UI Design
            estimatedQuantity = numAmount / effectivePrice; // Shares to sell
            const grossReturn = numAmount;
            fee = grossReturn * feeRate;
            total = grossReturn - fee;
        }

        return {
            price: effectivePrice,
            quantity: estimatedQuantity,
            fee: fee,
            total: total
        };
    }, [amount, side, assetPrice, orderType, limitPrice]);

    const handlePercentageClick = (percent: number) => {
        if (side === 'buy' && balance !== null) {
            setAmount((balance * percent).toFixed(2));
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            setError('Enter a valid amount');
            return;
        }
        if (orderType === 'limit' && (!limitPrice || parseFloat(limitPrice) <= 0)) {
            setError('Enter a valid limit price');
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
            const payload: any = {
                assetId,
                side,
                type: orderType,
                amount: parseFloat(amount)
            };

            if (orderType === 'limit') {
                payload.limitPrice = parseFloat(limitPrice);
                if (takeProfit) payload.takeProfit = parseFloat(takeProfit);
                if (stopLoss) payload.stopLoss = parseFloat(stopLoss);
            }

            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Trade failed');
            }

            showNotification('success', 'Order placed successfully');
            setAmount('');
            if (onTradeSuccess) onTradeSuccess();
        } catch (err: any) {
            setError(err.message);
            showNotification('error', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col h-full w-full relative group/container">
            {/* 1. Integrated Header & Controls */}
            <div className="flex-none p-4 pb-0 space-y-4">
                {/* Buy/Sell Tabs - Floating Pill Design */}
                <div className="bg-black/40 border border-white/5 p-1 rounded-xl flex relative isolate overflow-hidden">
                    <button
                        onClick={() => setSide('buy')}
                        className={`flex-1 py-2.5 relative z-10 transition-colors duration-200 font-black uppercase tracking-[0.1em] text-[10px] flex items-center justify-center gap-2 ${side === 'buy' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Buy
                        {side === 'buy' && (
                            <motion.div
                                layoutId="active-tab-bg"
                                className="absolute inset-0 bg-emerald-500/10 border border-emerald-500/20 rounded-lg -z-10"
                                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setSide('sell')}
                        className={`flex-1 py-2.5 relative z-10 transition-colors duration-200 font-black uppercase tracking-[0.1em] text-[10px] flex items-center justify-center gap-2 ${side === 'sell' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Sell
                        {side === 'sell' && (
                            <motion.div
                                layoutId="active-tab-bg"
                                className="absolute inset-0 bg-rose-500/10 border border-rose-500/20 rounded-lg -z-10"
                                transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                            />
                        )}
                    </button>
                </div>

                {/* Order Type Toggle */}
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Order Type</span>
                    <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5">
                        <button
                            onClick={() => setOrderType('market')}
                            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${orderType === 'market' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Market
                        </button>
                        <button
                            onClick={() => setOrderType('limit')}
                            className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${orderType === 'limit' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            Limit
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Scrollable Form Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

                {/* Main Inputs - Clean Design (No Glows) */}
                <div className="space-y-4">
                    {/* Amount Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-500 px-1">
                            <span>Amount (USD)</span>
                            <div className="flex items-center gap-1.5 font-mono">
                                <Wallet className="w-3 h-3" />
                                <span>{balance ? `$${balance.toFixed(2)}` : '--'}</span>
                            </div>
                        </div>
                        <div className={`relative bg-white/[0.02] border border-white/5 rounded-xl transition-colors focus-within:border-white/20 hover:border-white/10`}>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => {
                                    setAmount(e.target.value);
                                    setError(null);
                                }}
                                placeholder="0.00"
                                className="w-full bg-transparent px-4 py-3 text-xl font-bold text-white placeholder-zinc-800 outline-none tabular-nums"
                            />
                            {side === 'buy' && (
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                    <button
                                        onClick={() => handlePercentageClick(1.0)}
                                        className="px-2 py-1 text-[9px] font-bold bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white rounded uppercase transition-colors"
                                    >
                                        Max
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* Percentages Bar */}
                        {side === 'buy' && (
                            <div className="flex gap-2">
                                {[0.25, 0.5, 0.75].map((pct) => (
                                    <button
                                        key={pct}
                                        onClick={() => handlePercentageClick(pct)}
                                        className="flex-1 py-1 text-[9px] font-bold text-zinc-600 bg-white/[0.02] hover:bg-white/[0.05] hover:text-zinc-300 rounded-lg transition-colors border border-transparent hover:border-white/5"
                                    >
                                        {pct * 100}%
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Limit Price Input */}
                    <AnimatePresence>
                        {orderType === 'limit' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-4 overflow-hidden"
                            >
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] uppercase font-bold text-zinc-500 px-1">
                                        <span>Limit Price ($)</span>
                                        <button
                                            onClick={() => setLimitPrice(assetPrice.toFixed(2))}
                                            className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            Last
                                        </button>
                                    </div>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl flex items-center px-4 py-3 focus-within:border-white/20 transition-colors">
                                        <input
                                            type="number"
                                            value={limitPrice}
                                            onChange={(e) => setLimitPrice(e.target.value)}
                                            className="w-full bg-transparent text-lg font-bold text-white placeholder-zinc-800 outline-none tabular-nums"
                                            placeholder={assetPrice.toFixed(2)}
                                        />
                                    </div>
                                </div>

                                {/* Advanced TP/SL Section */}
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="space-y-2">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 px-1">Take Profit</span>
                                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2.5 focus-within:border-emerald-500/30 transition-colors">
                                            <input
                                                type="number"
                                                value={takeProfit}
                                                onChange={(e) => setTakeProfit(e.target.value)}
                                                className="w-full bg-transparent text-sm font-bold text-emerald-400 placeholder-emerald-500/20 outline-none tabular-nums"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <span className="text-[10px] uppercase font-bold text-zinc-500 px-1">Stop Loss</span>
                                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl px-3 py-2.5 focus-within:border-rose-500/30 transition-colors">
                                            <input
                                                type="number"
                                                value={stopLoss}
                                                onChange={(e) => setStopLoss(e.target.value)}
                                                className="w-full bg-transparent text-sm font-bold text-rose-400 placeholder-rose-500/20 outline-none tabular-nums"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Summary Section */}
                <div className="pt-2">
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
                                <p className="text-xs text-rose-200 font-bold leading-relaxed">{error}</p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="summary"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-2.5 p-2"
                            >
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-zinc-500 font-medium">Est. Price</span>
                                    <span className="text-white font-mono font-bold">${(orderType === 'limit' && limitPrice ? parseFloat(limitPrice) : assetPrice).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-zinc-500 font-medium">Fee (1%)</span>
                                    <span className="text-zinc-400 font-mono">${estimation ? estimation.fee.toFixed(2) : '0.00'}</span>
                                </div>
                                <div className="h-px bg-white/5 my-1" />
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Total Est.</span>
                                    <div className="text-right">
                                        <div className={`text-base font-black tabular-nums ${activeColor}`}>
                                            {side === 'buy'
                                                ? estimation ? estimation.quantity.toFixed(4) : '0.0000'
                                                : estimation ? `$${estimation.total.toFixed(2)}` : '$0.00'
                                            }
                                            <span className="text-[9px] text-zinc-500 ml-1 font-bold">
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

            {/* 3. Action Button */}
            <div className="p-4 mt-auto border-t border-white/5 bg-black/20">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || (side === 'buy' && !amount)}
                    className={`w-full relative group h-12 rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-[0.98] transition-all bg-gradient-to-r ${btnGradient}`}
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-200" />

                    <div className="relative h-full flex items-center justify-center gap-2">
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                        ) : (
                            <>
                                <span className="text-white font-black uppercase tracking-[0.2em] text-xs">
                                    {orderType === 'limit' ? `Place Limit ${side}` : `${side} Now`}
                                </span>
                                {side === 'buy' ? (
                                    <TrendingUp className="w-4 h-4 text-white/90" />
                                ) : (
                                    <TrendingDown className="w-4 h-4 text-white/90" />
                                )}
                            </>
                        )}
                    </div>
                </button>
            </div>
        </div>
    );
}

export default OrderForm;
