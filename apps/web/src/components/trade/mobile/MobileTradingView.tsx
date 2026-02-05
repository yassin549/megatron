'use client';

import { useState, useMemo, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, TrendingUp, TrendingDown, LineChart, BookOpen, Sparkles, BarChart3, X, Loader2, Crosshair, RulerIcon, TrendingUpIcon, Minus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useNotification } from '@/context/NotificationContext';
import { MobileOrderBook } from './MobileOrderBook';
import { MobileOracleTerminal } from './MobileOracleTerminal';
import { MobileStatsPanel } from './MobileStatsPanel';
import { AssetChart } from '@/components/assets/AssetChart';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

type MobileTab = 'chart' | 'book' | 'oracle' | 'stats';

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

const tabs: { id: MobileTab; icon: React.ElementType; label: string }[] = [
    { id: 'chart', icon: LineChart, label: 'Chart' },
    { id: 'book', icon: BookOpen, label: 'Book' },
    { id: 'oracle', icon: Sparkles, label: 'AI' },
    { id: 'stats', icon: BarChart3, label: 'Stats' },
];

// Tab indicator colors based on active tab
const tabColors: Record<MobileTab, { bg: string; border: string; glow: string }> = {
    chart: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/20' },
    book: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', glow: 'shadow-blue-500/20' },
    oracle: { bg: 'bg-violet-500/20', border: 'border-violet-500/40', glow: 'shadow-violet-500/20' },
    stats: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', glow: 'shadow-amber-500/20' },
};

const tabActiveColors: Record<MobileTab, string> = {
    chart: 'text-emerald-400',
    book: 'text-blue-400',
    oracle: 'text-violet-400',
    stats: 'text-amber-400',
};

// Chart tool buttons
const chartTools = [
    { id: 'crosshair', icon: Crosshair, label: 'Crosshair' },
    { id: 'segment', icon: RulerIcon, label: 'Trend Line' },
    { id: 'fibonacciRetracement', icon: TrendingUpIcon, label: 'Fib' },
    { id: 'horizontalRay', icon: Minus, label: 'H-Line' },
];

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
    const [activeTool, setActiveTool] = useState<string | null>(null);
    const [timeframe, setTimeframe] = useState('4h');

    // Lock body scroll when on chart tab to prevent scrolling
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (activeTab === 'chart') {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
        return () => {
            if (typeof window !== 'undefined') {
                document.body.style.overflow = '';
            }
        };
    }, [activeTab]);

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

    // Page transition direction
    const getDirection = (newTab: MobileTab) => {
        const currentIndex = tabs.findIndex(t => t.id === activeTab);
        const newIndex = tabs.findIndex(t => t.id === newTab);
        return newIndex > currentIndex ? 1 : -1;
    };

    const pageVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? '100%' : '-100%',
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction > 0 ? '-100%' : '100%',
            opacity: 0,
        }),
    };

    return (
        <div className="lg:hidden flex flex-col h-full min-h-0 relative">
            {/* Header with Asset Name */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 bg-black/60 backdrop-blur-xl z-20">
                <Link
                    href="/"
                    className="p-1.5 -ml-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg"
                >
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate">
                        {asset.name}
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white tabular-nums">
                            ${livePrice.toFixed(2)}
                        </span>
                        <span
                            className={`text-[10px] font-bold tabular-nums ${isPositive ? 'text-emerald-400' : 'text-rose-400'
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

            {/* Floating Buy/Sell Buttons - Only on chart page, no container */}
            {activeTab === 'chart' && (
                <div className="fixed top-[140px] left-4 right-4 z-40 flex gap-3 lg:hidden">
                    <motion.button
                        onClick={() => handleOpenTrade('buy')}
                        whileTap={{ scale: 0.97 }}
                        className="flex-1 h-10 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-xl shadow-emerald-900/40"
                    >
                        <TrendingUp className="w-4 h-4" />
                        Buy
                    </motion.button>
                    <motion.button
                        onClick={() => handleOpenTrade('sell')}
                        whileTap={{ scale: 0.97 }}
                        className="flex-1 h-10 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-xl shadow-rose-900/40"
                    >
                        <TrendingDown className="w-4 h-4" />
                        Sell
                    </motion.button>
                </div>
            )}

            {/* Timeframe Toggle - Only on chart page */}
            {activeTab === 'chart' && (
                <div className="fixed top-[196px] left-4 right-4 z-40 flex justify-center lg:hidden">
                    <div className="flex items-center gap-1 p-1 bg-[#0d1421]/90 backdrop-blur-md border border-white/10 rounded-lg shadow-lg relative">
                        {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => {
                            const isActive = timeframe === tf;
                            return (
                                <button
                                    key={tf}
                                    onClick={() => setTimeframe(tf)}
                                    className={`relative z-10 px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors duration-200 ${isActive ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTimeframe"
                                            className="absolute inset-0 bg-blue-500 rounded-md -z-10 shadow-sm"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                    {tf.toUpperCase()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* FIXED Floating Chart Tools - Only on chart page */}
            {activeTab === 'chart' && (
                <div className="fixed left-3 top-[250px] z-40 lg:hidden">
                    <div className="flex flex-col gap-1 p-1.5 bg-[#0d1421]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl">
                        {chartTools.map((tool) => {
                            const Icon = tool.icon;
                            const isActive = activeTool === tool.id;
                            return (
                                <button
                                    key={tool.id}
                                    onClick={() => setActiveTool(isActive ? null : tool.id)}
                                    className={`p-2.5 rounded-lg transition-all ${isActive
                                        ? 'bg-primary/20 text-primary border border-primary/30'
                                        : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/5'
                                        }`}
                                    title={tool.label}
                                >
                                    <Icon className="w-4 h-4" />
                                </button>
                            );
                            <Icon className="w-4 h-4" />
                                </button>
                    );
                        })}
                    {/* Timeframe Buttons in Tools Bar */}
                    <div className="w-px h-4 bg-white/10 mx-1" />
                    {['1m', '15m', '4h', '1d', 'all'].map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${timeframe === tf
                                ? 'bg-blue-500 text-white shadow-sm'
                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                                }`}
                        >
                            {tf === 'all' ? 'ALL' : tf.toUpperCase()}
                        </button>
                    ))}
                </div>
                </div>
    )
}

{/* FIXED Floating Tab Navigation - Vertically centered on left side */ }
<div className="fixed left-3 bottom-[140px] z-40 lg:hidden">
    <div className="flex flex-col gap-1 p-1.5 bg-[#0d1421]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl">
        {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const colors = tabColors[tab.id];
            const activeColor = tabActiveColors[tab.id];
            return (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative p-3 rounded-lg transition-all duration-300 ${isActive
                        ? activeColor
                        : 'text-zinc-600 hover:text-zinc-400'
                        }`}
                    title={tab.label}
                >
                    <Icon className="w-5 h-5" />
                    {isActive && (
                        <motion.div
                            layoutId="tab-indicator-mobile"
                            className={`absolute inset-0 ${colors.bg} border ${colors.border} rounded-lg -z-10 shadow-lg ${colors.glow}`}
                            transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                        />
                    )}
                </button>
            );
        })}
    </div>
</div>

{/* Content Area - Full width, ends above bottom nav */ }
<div className="flex-1 min-h-0 relative overflow-hidden pb-[72px]">
    <AnimatePresence mode="wait" custom={getDirection(activeTab)}>
        {activeTab === 'chart' && (
            <motion.div
                key="chart"
                custom={getDirection('chart')}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute top-0 left-0 right-0 bottom-[72px]"
            >
                {chartData.length > 0 ? (
                    <ErrorBoundary name="Mobile Chart">
                        <AssetChart
                            data={chartData}
                            activeTimeframe={timeframe as any}
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
                    <div className="h-full flex items-center justify-center bg-black/20">
                        <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    </div>
                )}
            </motion.div>
        )}

        {activeTab === 'book' && (
            <motion.div
                key="book"
                custom={getDirection('book')}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0"
            >
                <MobileOrderBook assetId={asset.id} assetPrice={livePrice} />
            </motion.div>
        )}

        {activeTab === 'oracle' && (
            <motion.div
                key="oracle"
                custom={getDirection('oracle')}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0 overflow-y-auto"
            >
                <MobileOracleTerminal oracleLogs={oracleLogs} />
            </motion.div>
        )}

        {activeTab === 'stats' && (
            <motion.div
                key="stats"
                custom={getDirection('stats')}
                variants={pageVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0 overflow-y-auto"
            >
                <MobileStatsPanel stats={stats} assetName={asset.name} price={livePrice} change={asset.change24h} />
            </motion.div>
        )}
    </AnimatePresence>
</div>

{/* Trade Sheet Modal */ }
<AnimatePresence>
    {showTradeSheet && (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 z-50"
                onClick={() => setShowTradeSheet(false)}
            />
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed bottom-[72px] left-0 right-0 z-50 bg-zinc-900 rounded-t-3xl border-t border-white/10 max-h-[60vh] overflow-y-auto"
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
        </div >
    );
}

// Inline Trade Sheet Component
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
    const { status } = useSession();
    const { showNotification } = useNotification();

    const [amount, setAmount] = useState('');
    const [balance, setBalance] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useState(() => {
        if (status === 'authenticated') {
            fetch('/api/user/me')
                .then((res) => res.json())
                .then((data) => setBalance(parseFloat(data.walletHotBalance || '0')))
                .catch(() => { });
        }
    });

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
        <div className="p-5 pb-8">
            {/* Handle */}
            <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">
                    {isBuy ? 'Buy' : 'Sell'} {assetName}
                </h3>
                <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-lg transition-colors">
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
                    <span>≈ {estimation.quantity.toFixed(4)} shares</span>
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
