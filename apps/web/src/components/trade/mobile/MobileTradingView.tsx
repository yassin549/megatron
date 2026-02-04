'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { MobileTabBar, MobileTab } from './MobileTabBar';
import { MobileOrderBook } from './MobileOrderBook';
import { MobileOracleTerminal } from './MobileOracleTerminal';
import { MobileStatsPanel } from './MobileStatsPanel';
import { AssetChart } from '@/components/assets/AssetChart';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

interface Asset {
    id: string;
    name: string;
    price: number;
    marketPrice: number;
    change24h: number;
    marketCap: number;
    liquidity: number;
    totalSupply: number;
    low24h?: number;
    high24h?: number;
    userPosition?: {
        shares: number;
        avgPrice: number;
        stopLoss: number | null;
        takeProfit: number | null;
    } | null;
    userTrades?: Array<{
        time: number;
        price: number;
        quantity: number;
        side: 'buy' | 'sell';
    }>;
}

interface OracleLog {
    id: string;
    deltaPercent: number;
    confidence: number;
    summary: string | null;
    reasoning?: string | null;
    sourceUrls: string[];
    createdAt: string;
}

interface PricePoint {
    timestamp: string;
    price: number;
}

interface MobileTradingViewProps {
    asset: Asset;
    oracleLogs: OracleLog[];
    priceHistory: PricePoint[];
    livePrice: number;
    onRefresh: () => void;
}

export function MobileTradingView({
    asset,
    oracleLogs,
    priceHistory,
    livePrice,
    onRefresh,
}: MobileTradingViewProps) {
    const [activeTab, setActiveTab] = useState<MobileTab>('chart');
    const [showTradeSheet, setShowTradeSheet] = useState(false);
    const [tradeSide, setTradeSide] = useState<'buy' | 'sell'>('buy');

    const chartData = useMemo(() => {
        return (priceHistory || [])
            .map((p) => {
                let time = 0;
                try {
                    const d = new Date(p.timestamp);
                    time = isNaN(d.getTime()) ? 0 : Math.floor(d.getTime() / 1000);
                } catch { }
                return {
                    time: time as any,
                    value: Number(p.price || 0),
                };
            })
            .filter((d) => d.time > 0)
            .sort((a, b) => (a.time as number) - (b.time as number))
            .filter((item, index, self) => index === 0 || item.time !== self[index - 1].time);
    }, [priceHistory]);

    const chartColors = useMemo(
        () => ({
            lineColor: asset.change24h >= 0 ? '#10b981' : '#f43f5e',
            areaTopColor: asset.change24h >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)',
            areaBottomColor: asset.change24h >= 0 ? 'rgba(16, 185, 129, 0)' : 'rgba(244, 63, 94, 0)',
            textColor: '#52525b',
        }),
        [asset.change24h]
    );

    const priceLines = useMemo(() => {
        if (!asset.userPosition || asset.userPosition.shares === 0) return {};
        return {
            entry: asset.userPosition.avgPrice,
            stopLoss: asset.userPosition.stopLoss,
            takeProfit: asset.userPosition.takeProfit,
        };
    }, [asset.userPosition]);

    const stats = useMemo(
        () => ({
            marketCap: asset.marketCap || 0,
            liquidity: asset.liquidity || 0,
            supply: asset.totalSupply || 0,
            low24h: asset.low24h,
            high24h: asset.high24h,
        }),
        [asset]
    );

    const isPositive = asset.change24h >= 0;

    const handleOpenTrade = (side: 'buy' | 'sell') => {
        setTradeSide(side);
        setShowTradeSheet(true);
    };

    return (
        <div className="lg:hidden flex flex-col h-full min-h-0">
            {/* Compact Asset Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-black/40">
                <Link
                    href="/"
                    className="p-2 -ml-2 text-zinc-500 hover:text-white transition-colors rounded-lg"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                        {asset.name}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white tabular-nums">
                            ${livePrice.toFixed(2)}
                        </span>
                        <span
                            className={`text-xs font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                        >
                            {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-bold text-emerald-500/80 uppercase tracking-widest">
                        Live
                    </span>
                </div>
            </div>

            {/* Chart - Clean, no sidebar tools */}
            <div className="h-[220px] shrink-0 bg-black/20">
                {chartData.length > 0 ? (
                    <ErrorBoundary name="Mobile Chart">
                        <AssetChart
                            data={chartData}
                            marginalPrice={livePrice}
                            marketPrice={asset.marketPrice}
                            watermarkText=""
                            colors={chartColors}
                            priceLines={priceLines}
                            userTrades={asset.userTrades}
                            hideTools
                        />
                    </ErrorBoundary>
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    </div>
                )}
            </div>

            {/* Tab Bar */}
            <div className="py-2 px-4 shrink-0">
                <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
            </div>

            {/* Tab Content - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'chart' && (
                        <motion.div
                            key="chart-empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="h-full"
                        />
                    )}

                    {activeTab === 'book' && (
                        <motion.div
                            key="book"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="h-full px-4"
                        >
                            <div className="bg-black/30 border border-white/5 rounded-2xl overflow-hidden h-full">
                                <MobileOrderBook assetId={asset.id} assetPrice={livePrice} />
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'oracle' && (
                        <motion.div
                            key="oracle"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="h-full"
                        >
                            <MobileOracleTerminal oracleLogs={oracleLogs} />
                        </motion.div>
                    )}

                    {activeTab === 'stats' && (
                        <motion.div
                            key="stats"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="h-full"
                        >
                            <MobileStatsPanel stats={stats} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Buy/Sell Action Buttons - Fixed above bottom nav */}
            <div className="px-4 py-3 border-t border-white/5 bg-black/80 backdrop-blur-xl">
                <div className="flex gap-3">
                    <button
                        onClick={() => handleOpenTrade('buy')}
                        className="flex-1 h-12 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-lg shadow-emerald-900/30"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Buy
                    </button>
                    <button
                        onClick={() => handleOpenTrade('sell')}
                        className="flex-1 h-12 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-lg shadow-rose-900/30"
                    >
                        <TrendingDown className="w-4 h-4" />
                        Sell
                    </button>
                </div>
            </div>

            {/* Trade Sheet - Slide up modal */}
            <AnimatePresence>
                {showTradeSheet && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 z-50"
                            onClick={() => setShowTradeSheet(false)}
                        />
                        {/* Sheet */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-white/10 max-h-[80vh] overflow-y-auto"
                        >
                            <TradeSheet
                                assetId={asset.id}
                                assetName={asset.name}
                                assetPrice={livePrice}
                                side={tradeSide}
                                onSideChange={setTradeSide}
                                onClose={() => setShowTradeSheet(false)}
                                onSuccess={() => {
                                    setShowTradeSheet(false);
                                    onRefresh();
                                }}
                            />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

// Trade Sheet Component (inline for simplicity)
import { useState as useLocalState, useEffect as useLocalEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useNotification } from '@/context/NotificationContext';
import { Loader2, X } from 'lucide-react';

interface TradeSheetProps {
    assetId: string;
    assetName: string;
    assetPrice: number;
    side: 'buy' | 'sell';
    onSideChange: (side: 'buy' | 'sell') => void;
    onClose: () => void;
    onSuccess: () => void;
}

function TradeSheet({
    assetId,
    assetName,
    assetPrice,
    side,
    onSideChange,
    onClose,
    onSuccess,
}: TradeSheetProps) {
    const { data: session, status } = useSession();
    const { showNotification } = useNotification();

    const [amount, setAmount] = useLocalState('');
    const [balance, setBalance] = useLocalState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useLocalState(false);
    const [error, setError] = useLocalState<string | null>(null);

    useLocalEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/user/me')
                .then((res) => res.json())
                .then((data) => setBalance(parseFloat(data.walletHotBalance || '0')))
                .catch(() => { });
        }
    }, [status]);

    const estimation = useMemo(() => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return null;
        const feeRate = 0.01;
        const fee = numAmount * feeRate;
        return {
            quantity: (numAmount - fee) / assetPrice,
            fee,
            total: numAmount,
        };
    }, [amount, assetPrice]);

    const handlePercentage = (pct: number) => {
        if (balance !== null) {
            setAmount((balance * pct).toFixed(2));
            setError(null);
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
                    type: 'market',
                    amount: parseFloat(amount),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Trade failed');
            showNotification('success', 'Order placed!');
            onSuccess();
        } catch (err: any) {
            setError(err.message);
            showNotification('error', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isBuy = side === 'buy';

    return (
        <div className="p-5">
            {/* Handle */}
            <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">
                    {isBuy ? 'Buy' : 'Sell'} {assetName}
                </h3>
                <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Buy/Sell Toggle */}
            <div className="flex bg-white/[0.03] border border-white/5 rounded-xl p-1 mb-5">
                <button
                    onClick={() => onSideChange('buy')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${isBuy
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'text-zinc-500'
                        }`}
                >
                    Buy
                </button>
                <button
                    onClick={() => onSideChange('sell')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${!isBuy
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'text-zinc-500'
                        }`}
                >
                    Sell
                </button>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-2 px-1">
                    <span>Amount (USD)</span>
                    <span className="tabular-nums">Balance: ${balance?.toFixed(2) ?? '--'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => {
                            setAmount(e.target.value);
                            setError(null);
                        }}
                        placeholder="0.00"
                        className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-lg font-bold text-white placeholder-zinc-700 outline-none focus:border-white/20 tabular-nums"
                        inputMode="decimal"
                    />
                    <button
                        onClick={() => handlePercentage(1)}
                        className="px-4 py-3.5 text-xs font-bold text-zinc-400 bg-white/[0.03] border border-white/10 rounded-xl hover:bg-white/[0.06] transition-colors"
                    >
                        MAX
                    </button>
                </div>
            </div>

            {/* Quick Percentages */}
            <div className="flex gap-2 mb-5">
                {[0.25, 0.5, 0.75].map((pct) => (
                    <button
                        key={pct}
                        onClick={() => handlePercentage(pct)}
                        className="flex-1 py-2 text-xs font-bold text-zinc-600 bg-white/[0.02] rounded-lg border border-white/5 hover:bg-white/[0.04] hover:text-zinc-400 transition-colors"
                    >
                        {pct * 100}%
                    </button>
                ))}
            </div>

            {/* Estimation */}
            {estimation && (
                <div className="flex items-center justify-between text-sm px-1 mb-4 text-zinc-400">
                    <span>≈ {estimation.quantity.toFixed(4)} {assetName}</span>
                    <span className="text-zinc-600">Fee: ${estimation.fee.toFixed(2)}</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="text-sm text-rose-400 font-medium px-1 mb-4">{error}</div>
            )}

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={isSubmitting || !amount}
                className={`w-full h-14 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${isBuy
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40'
                    }`}
            >
                {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <>
                        {isBuy ? 'Confirm Buy' : 'Confirm Sell'}
                    </>
                )}
            </button>
        </div>
    );
}
