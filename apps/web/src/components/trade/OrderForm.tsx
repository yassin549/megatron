'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Shield, Wallet, Settings2, ChevronDown } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

interface OrderFormProps {
    assetId: string;
    assetPrice: number;
    marketPrice: number;
    assetSymbol?: string;
    onTradeSuccess?: () => void;
    onExecutionPriceChange?: (price: number) => void;
    totalSupply?: number;
    pricingParams?: { P0: number; k: number };
    userPosition?: {
        shares: number;
        avgPrice: number;
    } | null;
}

export function OrderForm({
    assetId,
    assetPrice,
    marketPrice,
    assetSymbol = 'Share',
    onTradeSuccess,
    onExecutionPriceChange,
    totalSupply = 0,
    pricingParams = { P0: 10, k: 0.01 },
    userPosition
}: OrderFormProps) {
    const { status } = useSession();
    const [type, setType] = useState<'buy' | 'sell'>('buy');
    const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');
    const [stopLoss, setStopLoss] = useState('');
    const [takeProfit, setTakeProfit] = useState('');
    const [loading, setLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [slippageSetting, setSlippageSetting] = useState('1');
    const [showRiskSettings, setShowRiskSettings] = useState(false);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/user/me').then(res => res.json()).then(data => {
                if (data.walletHotBalance) setUserBalance(parseFloat(data.walletHotBalance));
            });
        }
    }, [status]);

    const isBuy = type === 'buy';
    const SWAP_FEE = 0.005;

    const P0 = pricingParams?.P0 ?? 10;
    const k = pricingParams?.k ?? 0.01;
    const S = totalSupply;

    const executionEst = useMemo(() => {
        if (orderType === 'limit') return parseFloat(price) || assetPrice;
        if (!amount || parseFloat(amount) <= 0) return assetPrice;

        const usdc = parseFloat(amount);
        if (isBuy) {
            const netUsdc = usdc * (1 - SWAP_FEE);
            const a = k / 2;
            const b = P0 + k * S;
            const c = -netUsdc;
            const discriminant = b * b - 4 * a * c;
            if (discriminant < 0) return assetPrice;
            const deltaS = (-b + Math.sqrt(discriminant)) / (2 * a);
            return netUsdc / deltaS;
        } else {
            const a = k / 2;
            const b = -(P0 + k * S);
            const c = usdc;
            const discriminant = b * b - 4 * a * c;
            if (discriminant < 0) return assetPrice;
            const deltaS = (-b - Math.sqrt(discriminant)) / (2 * a);
            return usdc / deltaS;
        }
    }, [amount, assetPrice, orderType, price, isBuy, k, P0, S]);

    useEffect(() => {
        onExecutionPriceChange?.(executionEst);
    }, [executionEst, onExecutionPriceChange]);

    const slippage = ((executionEst - assetPrice) / assetPrice) * 100;
    const estimatedShares = amount ? parseFloat(amount) / executionEst : 0;

    const { showStatusModal } = useNotification();

    const handlePercentageClick = (percent: number) => {
        if (isBuy) {
            const val = userBalance * percent;
            setAmount(val > 0 ? val.toFixed(2) : '');
        } else {
            if (userPosition && userPosition.shares > 0) {
                const sharesToSell = userPosition.shares * percent;
                const distinctUsdc = sharesToSell * assetPrice;
                setAmount(distinctUsdc > 0 ? distinctUsdc.toFixed(2) : '');
            }
        }
    };

    const handleTrade = async () => {
        if (!amount) return;
        setLoading(true);
        try {
            const slValue = stopLoss ? parseFloat(stopLoss) : null;
            const tpValue = takeProfit ? parseFloat(takeProfit) : null;

            if (orderType === 'market') {
                const slippagePercent = parseFloat(slippageSetting) || 1;
                const minOutputMultiplier = (100 - slippagePercent) / 100;
                let minOutputAmount = undefined;

                if (isBuy) {
                    if (estimatedShares > 0) minOutputAmount = (estimatedShares * minOutputMultiplier).toString();
                } else {
                    if (amount && parseFloat(amount) > 0) {
                        const estimatedRevenue = parseFloat(amount) * executionEst;
                        const estNet = estimatedRevenue * (1 - SWAP_FEE);
                        minOutputAmount = (estNet * minOutputMultiplier).toString();
                    }
                }

                const res = await fetch('/api/trade', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: type,
                        assetId: assetId,
                        amount: parseFloat(amount),
                        stopLoss: slValue,
                        takeProfit: tpValue,
                        minOutputAmount,
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
            } else {
                const priceValue = parseFloat(price);
                if (isNaN(priceValue) || priceValue <= 0) throw new Error('Invalid limit price');

                const res = await fetch('/api/order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        assetId,
                        side: type,
                        price: priceValue,
                        quantity: parseFloat(amount) / priceValue,
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
            }

            setAmount('');
            setStopLoss('');
            setTakeProfit('');
            await onTradeSuccess?.();
            showStatusModal({ type: 'success', title: 'DONE', message: 'Order executed successfully' });
        } catch (err: any) {
            showStatusModal({ type: 'error', title: 'FAILED', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (status !== 'authenticated') {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center gap-6">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                    <Wallet className="w-8 h-8 text-zinc-600" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black text-white uppercase tracking-[0.2em]">Connect Wallet</h3>
                    <p className="text-zinc-500 text-xs font-medium max-w-[200px] leading-relaxed">Please connect your wallet to access the trading terminal.</p>
                </div>
                <Link href="/login" className="px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-full hover:scale-105 transition-transform shadow-xl">
                    Connect
                </Link>
            </div>
        );
    }

    const springConfig = { type: 'spring', stiffness: 400, damping: 30 };

    return (
        <LayoutGroup>
            <div className="flex flex-col h-full gap-10">
                {/* Toggles Row */}
                <div className="flex items-center justify-between">
                    {/* Buy/Sell Word Switcher */}
                    <div className="relative flex items-center gap-10">
                        <button
                            onClick={() => setType('buy')}
                            className={`relative text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-300 ${isBuy ? 'text-emerald-400' : 'text-zinc-700'}`}
                        >
                            Buy
                            {isBuy && (
                                <motion.div
                                    layoutId="type-indicator"
                                    className="absolute -bottom-2 left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_4px_10px_rgba(52,211,153,0.5)]"
                                    transition={springConfig}
                                />
                            )}
                        </button>
                        <button
                            onClick={() => setType('sell')}
                            className={`relative text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-300 ${!isBuy ? 'text-rose-400' : 'text-zinc-700'}`}
                        >
                            Sell
                            {!isBuy && (
                                <motion.div
                                    layoutId="type-indicator"
                                    className="absolute -bottom-2 left-0 right-0 h-[2px] bg-rose-400 shadow-[0_4px_10px_rgba(251,113,133,0.5)]"
                                    transition={springConfig}
                                />
                            )}
                        </button>
                    </div>

                    {/* Market/Limit Word Switcher */}
                    <div className="relative flex items-center gap-10">
                        <button
                            onClick={() => setOrderType('market')}
                            className={`relative text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-300 ${orderType === 'market' ? 'text-white' : 'text-zinc-700'}`}
                        >
                            Mkt
                            {orderType === 'market' && (
                                <motion.div
                                    layoutId="order-indicator"
                                    className="absolute -bottom-2 left-0 right-0 h-[2px] bg-white shadow-[0_4px_10px_rgba(255,255,255,0.3)]"
                                    transition={springConfig}
                                />
                            )}
                        </button>
                        <button
                            onClick={() => setOrderType('limit')}
                            className={`relative text-[10px] font-black uppercase tracking-[0.3em] transition-colors duration-300 ${orderType === 'limit' ? 'text-white' : 'text-zinc-700'}`}
                        >
                            Lmt
                            {orderType === 'limit' && (
                                <motion.div
                                    layoutId="order-indicator"
                                    className="absolute -bottom-2 left-0 right-0 h-[2px] bg-white shadow-[0_4px_10px_rgba(255,255,255,0.3)]"
                                    transition={springConfig}
                                />
                            )}
                        </button>
                    </div>
                </div>

                {/* Amount Section */}
                <div className="space-y-6">
                    <div className="space-y-1">
                        <div className="flex items-center justify-between px-1 mb-2">
                            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Amount</span>
                            <div className="flex items-center gap-1.5 grayscale opacity-50">
                                <Wallet className="w-2.5 h-2.5" />
                                <span className="text-[9px] font-mono font-bold text-zinc-400">
                                    {isBuy ? `$${userBalance.toFixed(2)}` : `${userPosition?.shares?.toFixed(2) || '0.00'} Unit`}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center relative gap-2">
                                <span className={`text-4xl font-black font-mono transition-colors ${isBuy ? 'text-emerald-500/50' : 'text-rose-500/50'}`}>$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-transparent border-none focus:ring-0 text-5xl font-black text-white font-mono tracking-tighter placeholder-zinc-800 p-0"
                                />
                            </div>
                            <motion.div
                                initial={false}
                                animate={{ opacity: amount ? 1 : 0, y: amount ? 0 : 5 }}
                                className="flex items-center gap-2 mt-2 px-1 text-[10px] font-black text-zinc-600 uppercase tracking-widest italic"
                            >
                                <ChevronDown className="w-3 h-3" />
                                {estimatedShares.toFixed(4)} {assetSymbol}
                            </motion.div>
                        </div>
                    </div>

                    {/* Percentages Row */}
                    <div className="flex items-center justify-between px-1">
                        {[0.25, 0.5, 0.75, 1].map((pct) => (
                            <button
                                key={pct}
                                onClick={() => handlePercentageClick(pct)}
                                className="text-[10px] font-black text-zinc-700 hover:text-white transition-colors uppercase tracking-[0.2em]"
                            >
                                {pct === 1 ? 'Full' : `${pct * 100}%`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Advanced Logic Area */}
                <div className="flex-1 flex flex-col gap-6">
                    <AnimatePresence mode="popLayout">
                        {orderType === 'limit' && (
                            <motion.div
                                key="limit-price"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={springConfig}
                                className="space-y-4"
                            >
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Limit Price</span>
                                <div className="flex items-center gap-3">
                                    <span className="text-xl font-black text-zinc-500 font-mono">$</span>
                                    <input
                                        type="number"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-3xl font-black text-white font-mono tracking-tight p-0"
                                        placeholder={assetPrice.toFixed(2)}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Settings Toggles */}
                    <div className="mt-auto space-y-6">
                        <button
                            onClick={() => setShowRiskSettings(!showRiskSettings)}
                            className="flex items-center gap-3 group"
                        >
                            <div className={`p-2 rounded-full transition-all duration-300 ${showRiskSettings ? 'bg-white text-black' : 'bg-white/5 text-zinc-600 group-hover:bg-white/10'}`}>
                                <Settings2 className="w-3 h-3" />
                            </div>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] transition-colors ${showRiskSettings ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                                Risk Management
                            </span>
                        </button>

                        <AnimatePresence>
                            {showRiskSettings && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="pt-2 space-y-8"
                                >
                                    <div className="grid grid-cols-2 gap-10">
                                        <div className="space-y-2">
                                            <span className="text-[8px] font-black text-rose-500/50 uppercase tracking-widest ml-1">Stop Loss</span>
                                            <input
                                                type="number"
                                                value={stopLoss}
                                                onChange={(e) => setStopLoss(e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 text-lg font-black text-white font-mono p-1"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div className="space-y-2 text-right">
                                            <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest mr-1">Take Profit</span>
                                            <input
                                                type="number"
                                                value={takeProfit}
                                                onChange={(e) => setTakeProfit(e.target.value)}
                                                className="w-full bg-transparent border-none focus:ring-0 text-lg font-black text-white font-mono p-1 text-right"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Slippage Tolerance</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={slippageSetting}
                                                onChange={(e) => setSlippageSetting(e.target.value)}
                                                className="w-10 bg-transparent border-none focus:ring-0 text-[10px] font-black text-white font-mono p-0 text-right"
                                            />
                                            <span className="text-[10px] text-zinc-600 font-bold">%</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Final Action Area */}
                <div className="relative mt-auto">
                    <button
                        onClick={handleTrade}
                        disabled={!amount || loading}
                        className={`group relative w-full h-16 rounded-full overflow-hidden transition-all duration-500 disabled:opacity-20 active:scale-95 ${isBuy ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    >
                        <div className="absolute inset-0 flex items-center justify-center gap-3">
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    <span className="text-xs font-black text-black uppercase tracking-[0.3em] font-italic">
                                        {isBuy ? 'Confirm Buy' : 'Confirm Sell'}
                                    </span>
                                    {isBuy ? <ArrowUpRight className="w-4 h-4 text-black" /> : <ArrowDownRight className="w-4 h-4 text-black" />}
                                </>
                            )}
                        </div>
                    </button>

                    <motion.div
                        initial={false}
                        animate={{ opacity: slippage > 2 ? 1 : 0 }}
                        className="absolute -top-6 left-0 right-0 text-center"
                    >
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] italic">
                            High Slippage Impact Detect: {slippage.toFixed(2)}%
                        </span>
                    </motion.div>
                </div>
            </div>
        </LayoutGroup>
    );
}
