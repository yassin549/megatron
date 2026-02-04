'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Shield, Target, Wallet, Info } from 'lucide-react';
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

    // Bonding Curve Stats
    const P0 = pricingParams?.P0 ?? 10;
    const k = pricingParams?.k ?? 0.01;
    const S = totalSupply;

    // Calculate Estimated Fill Price
    const executionEst = (() => {
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
    })();

    useEffect(() => {
        onExecutionPriceChange?.(executionEst);
    }, [executionEst, onExecutionPriceChange]);

    const slippage = ((executionEst - assetPrice) / assetPrice) * 100;
    const isHighSlippage = Math.abs(slippage) > 2;
    const estimatedShares = amount ? parseFloat(amount) / executionEst : 0;

    const { showStatusModal } = useNotification();

    const handlePercentageClick = (percent: number) => {
        if (isBuy) {
            const val = userBalance * percent;
            setAmount(val > 0 ? val.toFixed(2) : '');
        } else {
            // Sell logic: percent of held shares -> converted to approx USDC value
            if (userPosition && userPosition.shares > 0) {
                // Determine how many shares to sell
                const sharesToSell = userPosition.shares * percent;
                // Roughly estimate USDC value: shares * current price
                // Ideally we'd reverse calculate exact USDC but approx is fine for UI fill
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
                if (isBuy) {
                    if (slValue !== null && slValue >= executionEst) throw new Error('SL must be below Entry Price.');
                    if (tpValue !== null && tpValue <= executionEst) throw new Error('TP must be above Entry Price.');
                } else {
                    if (slValue !== null && slValue <= executionEst) throw new Error('SL must be above Entry Price.');
                    if (tpValue !== null && tpValue >= executionEst) throw new Error('TP must be below Entry Price.');
                }

                const slippagePercent = parseFloat(slippageSetting) || 1;
                const minOutputMultiplier = (100 - slippagePercent) / 100;

                let minOutputAmount = undefined;

                if (isBuy) {
                    if (estimatedShares > 0) {
                        minOutputAmount = (estimatedShares * minOutputMultiplier).toString();
                    }
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
            showStatusModal({
                type: 'success',
                title: 'DONE',
                message: `${estimatedShares.toFixed(4)} ${assetSymbol} units added`
            });
        } catch (err: any) {
            showStatusModal({
                type: 'error',
                title: 'ORDER FAILED',
                message: err.message || 'Unknown error'
            });
        } finally {
            setLoading(false);
        }
    };

    if (status !== 'authenticated') {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center border border-white/5">
                    <TrendingUp className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-widest">Trade Access</h3>
                    <p className="text-zinc-500 text-xs font-medium mt-1">Connect your wallet to start trading</p>
                </div>
                <Link href="/login" className="px-8 py-3 bg-white text-black font-black uppercase tracking-widest text-xs rounded-xl hover:scale-105 transition-transform">
                    Connect Wallet
                </Link>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Top Config Row: Order Type & Slippage Toggle */}
            <div className="flex items-center justify-between px-1">
                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                    {(['market', 'limit'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setOrderType(t)}
                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${orderType === t ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowRiskSettings(!showRiskSettings)}
                    className={`p-1.5 rounded-lg border transition-all ${showRiskSettings ? 'bg-primary/20 border-primary/50 text-white' : 'bg-transparent border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-white/5'}`}
                >
                    <Shield className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Main Action Area */}
            <div className="flex-1 flex flex-col gap-4">
                {/* Buy/Sell Switcher */}
                <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/5">
                    <button
                        onClick={() => setType('buy')}
                        className={`py-3 rounded-lg border text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isBuy
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                            : 'border-transparent text-zinc-600 hover:bg-white/5'
                            }`}
                    >
                        Buy
                    </button>
                    <button
                        onClick={() => setType('sell')}
                        className={`py-3 rounded-lg border text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${!isBuy
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.1)]'
                            : 'border-transparent text-zinc-600 hover:bg-white/5'
                            }`}
                    >
                        Sell
                    </button>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                    <div className="relative group">
                        <div className={`absolute -inset-0.5 rounded-2xl opacity-75 blur-sm transition duration-500 group-hover:duration-200 ${isBuy ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}></div>
                        <div className="relative flex flex-col bg-zinc-900/80 border border-white/10 rounded-xl overflow-hidden">
                            <div className="flex items-baseline px-4 pt-4 pb-1">
                                <span className="text-3xl font-black text-white font-mono tracking-tighter">$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-transparent border-none focus:ring-0 text-3xl font-black text-white font-mono tracking-tighter placeholder-zinc-700 p-0 ml-1"
                                />
                            </div>
                            <div className="px-4 pb-3 flex justify-between items-center bg-black/20 pt-2 border-t border-white/5">
                                <span className="text-[10px] text-zinc-500 font-bold tracking-wider">
                                    ≈ {estimatedShares.toFixed(2)} {assetSymbol}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <Wallet className="w-3 h-3 text-zinc-600" />
                                    <span className="text-[10px] font-mono text-zinc-400">
                                        {isBuy
                                            ? `$${userBalance.toFixed(2)}`
                                            : `${userPosition?.shares?.toFixed(2) || '0.00'} Shares`
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Percentages */}
                    <div className="grid grid-cols-4 gap-1.5">
                        {[0.25, 0.5, 0.75, 1].map((pct) => (
                            <button
                                key={pct}
                                onClick={() => handlePercentageClick(pct)}
                                className="py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[9px] font-black text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                            >
                                {pct === 1 ? 'MAX' : `${pct * 100}%`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Limit Price Input */}
                <AnimatePresence>
                    {orderType === 'limit' && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-black/30 rounded-xl p-3 border border-white/5"
                        >
                            <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-2 block">
                                Limit Price
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                                <input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-6 pr-3 text-sm font-mono text-white focus:border-white/20 transition-all font-bold"
                                    placeholder={assetPrice.toFixed(2)}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Advanced / Risk Management */}
                <AnimatePresence>
                    {showRiskSettings && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden space-y-3 pt-1"
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-rose-500/5 rounded-xl p-3 border border-rose-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Stop Loss</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={stopLoss}
                                        onChange={(e) => setStopLoss(e.target.value)}
                                        className="w-full bg-black/50 border border-white/5 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-zinc-700 focus:border-rose-500/30 transition-all"
                                        placeholder="Price"
                                    />
                                </div>
                                <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/10">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Take Profit</span>
                                    </div>
                                    <input
                                        type="number"
                                        value={takeProfit}
                                        onChange={(e) => setTakeProfit(e.target.value)}
                                        className="w-full bg-black/50 border border-white/5 rounded-lg px-2 py-1.5 text-xs font-mono text-white placeholder-zinc-700 focus:border-emerald-500/30 transition-all"
                                        placeholder="Price"
                                    />
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Max Slippage</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={slippageSetting}
                                        onChange={(e) => setSlippageSetting(e.target.value)}
                                        className="w-12 bg-black/50 border border-white/10 rounded-md py-1 text-center text-xs font-mono text-white"
                                    />
                                    <span className="text-xs text-zinc-500 font-bold">%</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Submit Button */}
            <button
                onClick={handleTrade}
                disabled={!amount || loading}
                className={`group relative w-full h-[60px] rounded-xl overflow-hidden transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isBuy ? 'shadow-[0_0_40px_rgba(16,185,129,0.2)]' : 'shadow-[0_0_40px_rgba(244,63,94,0.2)]'}`}
            >
                <div className={`absolute inset-0 transition-all duration-300 ${isBuy ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'}`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center relative z-10 gap-0.5">
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                        <>
                            <div className="flex items-center gap-2">
                                {isBuy ? <ArrowUpRight className="w-5 h-5 text-black" /> : <ArrowDownRight className="w-5 h-5 text-black" />}
                                <span className="text-sm font-black text-black uppercase tracking-[0.2em] italic">
                                    {isBuy ? 'Place Buy Order' : 'Place Sell Order'}
                                </span>
                            </div>
                            <span className="text-[9px] font-bold text-black/60 uppercase tracking-widest">
                                @ ${executionEst.toFixed(2)}
                            </span>
                        </>
                    )}
                </div>
            </button>
        </div>
    );
}
