'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { TrendingUp, TrendingDown, LineChart, BookOpen, Sparkles, BarChart3, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useNotification } from '@/context/NotificationContext';
import { MobileOrderBook } from './MobileOrderBook';
import { MobileOracleTerminal } from './MobileOracleTerminal';
import { MobileStatsPanel } from './MobileStatsPanel';
import { MobileHeader } from './MobileHeader';
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

    const handleOpenTrade = (side: 'buy' | 'sell') => {
        setTradeSide(side);
        setShowTradeSheet(true);
    };

    // Nav bar dimensions - match bottom nav bar size
    const NAV_BAR_WIDTH = 64; // Same visual weight as bottom nav height
    const NAV_BAR_BOTTOM = 80; // Above bottom nav bar (68px height + 12px gap)

    return (
        <div className="lg:hidden flex flex-col h-full min-h-0 relative bg-[#09090b]">
            {/* Fixed Header */}
            <MobileHeader
                assetName={asset.name}
                price={livePrice}
                change24h={asset.change24h}
            />

            {/* Main Content - Starts below header (h-14 = 56px, using pt-14) */}
            <div className="flex-1 pt-14 pb-[68px] relative overflow-hidden">

                {/* Chart Tab */}
                {activeTab === 'chart' && (
                    <div className="absolute inset-0 pt-14 pb-[68px]">
                        {/* Buy/Sell Buttons - Floating at top, below header */}
                        <div className="absolute top-16 left-4 right-4 z-40 flex gap-3">
                            <motion.button
                                onClick={() => handleOpenTrade('buy')}
                                whileTap={{ scale: 0.97 }}
                                className="flex-1 h-11 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/30"
                            >
                                <TrendingUp className="w-4 h-4" />
                                Buy
                            </motion.button>
                            <motion.button
                                onClick={() => handleOpenTrade('sell')}
                                whileTap={{ scale: 0.97 }}
                                className="flex-1 h-11 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-900/30"
                            >
                                <TrendingDown className="w-4 h-4" />
                                Sell
                            </motion.button>
                        </div>

                        {/* Chart Area - Full screen with proper offsets */}
                        <div className="absolute inset-0 pt-20 pl-16">
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
                                        hideTools={false}
                                        toolsPosition="bottom-left"
                                        toolsClassName="absolute left-4 bottom-4 z-30 flex flex-col gap-1.5 p-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl"
                                    />
                                </ErrorBoundary>
                            ) : (
                                <div className="h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Order Book Tab - Theme aware background */}
                {activeTab === 'book' && (
                    <div className="absolute inset-0 pt-14 pb-[68px] pl-16 bg-[#09090b]">
                        <div className="h-full overflow-y-auto">
                            <MobileOrderBook assetId={asset.id} assetPrice={livePrice} />
                        </div>
                    </div>
                )}

                {/* Oracle Tab - Theme aware background */}
                {activeTab === 'oracle' && (
                    <div className="absolute inset-0 pt-14 pb-[68px] pl-16 bg-[#09090b]">
                        <div className="h-full overflow-y-auto">
                            <MobileOracleTerminal oracleLogs={oracleLogs} />
                        </div>
                    </div>
                )}

                {/* Stats Tab - Theme aware background, NO duplicate header */}
                {activeTab === 'stats' && (
                    <div className="absolute inset-0 pt-14 pb-[68px] pl-16 bg-[#09090b]">
                        <div className="h-full overflow-y-auto">
                            {/* Pass undefined for assetName/price to hide duplicate header */}
                            <MobileStatsPanel
                                stats={stats}
                                assetName={asset.name}
                                price={livePrice}
                                change={asset.change24h}
                            />
                        </div>
                    </div>
                )}

                {/* Floating Vertical Nav Bar - Left side, matching bottom nav bar size */}
                <div
                    className="fixed left-0 bottom-[80px] z-50 flex flex-col bg-[#18181b]/95 backdrop-blur-xl border-r border-t border-white/5 rounded-tr-2xl shadow-2xl"
                    style={{ width: NAV_BAR_WIDTH }}
                >
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex flex-col items-center justify-center py-4 px-2 transition-all duration-200 ${isActive
                                        ? 'text-white bg-white/10'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                    }`}
                            >
                                <Icon className="w-5 h-5 mb-1" />
                                <span className="text-[9px] font-bold uppercase tracking-wide">
                                    {tab.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        layoutId="mobile-nav-indicator"
                                        className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-white rounded-l-full"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Trade Sheet Modal */}
            <AnimatePresence>
                {showTradeSheet && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 z-[60] backdrop-blur-sm"
                            onClick={() => setShowTradeSheet(false)}
                        />
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 z-[60] bg-[#09090b] rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-y-auto"
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
            <div className="flex justify-center mb-4">
                <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">
                    {isBuy ? 'Buy' : 'Sell'} {assetName}
                </h3>
                <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

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

            {estimation && (
                <div className="flex items-center justify-between text-sm px-1 mb-4 text-zinc-400">
                    <span>≈ {estimation.quantity.toFixed(4)} shares</span>
                    <span className="text-zinc-600">Fee: ${estimation.fee.toFixed(2)}</span>
                </div>
            )}

            {error && (
                <div className="text-sm text-rose-400 font-medium px-1 mb-4">{error}</div>
            )}

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
