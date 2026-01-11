'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, X, Plus } from 'lucide-react';
import { AssetChart } from '@/components/assets/AssetChart';
import { AITerminal } from '@/components/assets/AITerminal';
import { TradingSidebar } from '@/components/trade/TradingSidebar';
import {
    Clock,
    Activity,
    TrendingUp,
    Users,
    Trophy,
    LineChart,
    CloudSun,
    Bitcoin,
    Vote,
    Microscope,
    LayoutGrid,
    Zap
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

const TYPE_ICONS: Record<string, any> = {
    social: Users,
    sports: Trophy,
    economics: LineChart,
    weather: CloudSun,
    crypto: Bitcoin,
    politics: Vote,
    science: Microscope,
    active: Activity
};

interface Asset {
    id: string;
    name: string;
    description: string | null;
    type: string;
    status: 'active' | 'funding' | 'paused';
    price: number;
    marketPrice: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    totalSupply: number;
    liquidity: number;
    holders?: number;
    imageUrl?: string;
    low24h?: number;
    high24h?: number;
    userPosition?: {
        shares: number;
        avgPrice: number;
        stopLoss: number | null;
        takeProfit: number | null;
    } | null;
}

interface OracleLog {
    id: string;
    deltaPercent: number;
    confidence: number;
    summary: string | null;
    sourceUrls: string[];
    createdAt: string;
    reasoning?: string | null;
}

interface PricePoint {
    timestamp: string;
    price: number;
}

interface AssetDetailClientProps {
    initialAsset: Asset;
    initialOracleLogs: OracleLog[];
    initialPriceHistory: PricePoint[];
}

export function AssetDetailClient({
    initialAsset,
    initialOracleLogs,
    initialPriceHistory
}: AssetDetailClientProps) {
    const [asset, setAsset] = useState<Asset>(initialAsset);
    const [oracleLogs, setOracleLogs] = useState<OracleLog[]>(initialOracleLogs);
    const [priceHistory, setPriceHistory] = useState<PricePoint[]>(initialPriceHistory);

    // SL/TP state
    const [orderStopLoss, setOrderStopLoss] = useState(initialAsset.userPosition?.stopLoss?.toString() || '');
    const [orderTakeProfit, setOrderTakeProfit] = useState(initialAsset.userPosition?.takeProfit?.toString() || '');
    const [isUpdatingTargets, setIsUpdatingTargets] = useState(false);
    const [activePositionId, setActivePositionId] = useState<string | null>(null);
    const [isMobileTradeOpen, setIsMobileTradeOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    async function refreshData() {
        try {
            const res = await fetch(`/api/assets/${asset.id}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setAsset(data.asset);
                setOracleLogs(data.oracleLogs);
                setPriceHistory(data.priceHistory);

                // Sync targets if not currently updating
                if (!isUpdatingTargets) {
                    if (data.asset.userPosition && data.asset.userPosition.shares !== 0) {
                        setOrderStopLoss(data.asset.userPosition.stopLoss?.toString() || '');
                        setOrderTakeProfit(data.asset.userPosition.takeProfit?.toString() || '');

                        // Auto-select if no position is selected and this one exists
                        if (!activePositionId) {
                            setActivePositionId(data.asset.id);
                        }
                    } else {
                        // Position closed or non-existent, clear targets and selection
                        setOrderStopLoss('');
                        setOrderTakeProfit('');
                        setActivePositionId(null);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to sync asset', error);
        }
    }

    useEffect(() => {
        const interval = setInterval(refreshData, 10000);
        return () => clearInterval(interval);
    }, [asset.id]);

    const { showNotification } = useNotification();

    const handleChartUpdate = async (updates: Partial<Record<'stopLoss' | 'takeProfit', number | null>>) => {
        const entryPrice = asset.userPosition?.avgPrice || 0;
        const isLong = (asset.userPosition?.shares || 0) > 0;

        const slValue = 'stopLoss' in updates ? updates.stopLoss! : (orderStopLoss ? parseFloat(orderStopLoss) : null);
        const tpValue = 'takeProfit' in updates ? updates.takeProfit! : (orderTakeProfit ? parseFloat(orderTakeProfit) : null);

        try {
            // Validation
            for (const [type, value] of Object.entries(updates)) {
                if (value !== null) {
                    if (isLong) {
                        if (type === 'stopLoss' && value >= entryPrice) throw new Error('For Long positions, Stop Loss must be below Entry Price.');
                        if (type === 'takeProfit' && value <= entryPrice) throw new Error('For Long positions, Take Profit must be above Entry Price.');
                    } else if ((asset.userPosition?.shares || 0) < 0) {
                        if (type === 'stopLoss' && value <= entryPrice) throw new Error('For Short positions, Stop Loss must be above Entry Price.');
                        if (type === 'takeProfit' && value >= entryPrice) throw new Error('For Short positions, Take Profit must be below Entry Price.');
                    }
                }
            }

            if ('stopLoss' in updates) setOrderStopLoss(updates.stopLoss?.toString() || '');
            if ('takeProfit' in updates) setOrderTakeProfit(updates.takeProfit?.toString() || '');

            setIsUpdatingTargets(true);
            const res = await fetch('/api/trade/position', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: asset.id, stopLoss: slValue, takeProfit: tpValue }),
            });
            if (res.ok) {
                refreshData();
                showNotification('success', 'Position targets updated');
            }
        } catch (err: any) {
            showNotification('error', err.message);
        } finally {
            setIsUpdatingTargets(false);
        }
    };

    const chartData = priceHistory
        .map(p => ({
            time: Math.floor(new Date(p.timestamp).getTime() / 1000) as any,
            value: p.price,
            volume: (p as any).volume || 0
        }))
        .sort((a, b) => (a.time as number) - (b.time as number))
        .filter((item, index, self) =>
            index === 0 || item.time !== self[index - 1].time
        );

    const [imgError, setImgError] = useState(false);
    const Icon = TYPE_ICONS[asset.type] || LayoutGrid;

    // ... existing refresh functions ...

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen relative">
            {/* LEFT COLUMN - Main Content */}
            <div className="lg:col-span-8 p-4 md:p-8 lg:p-12 space-y-6 pb-32">


                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 relative bg-zinc-900 flex items-center justify-center">
                                {/* Fallback Icon */}
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                                    <Icon className="w-6 h-6" />
                                </div>

                                {asset.imageUrl && !imgError ? (
                                    <Image
                                        src={asset.imageUrl}
                                        alt={asset.name}
                                        fill
                                        priority
                                        className="object-cover relative z-10"
                                        onError={() => setImgError(true)}
                                        unoptimized={asset.imageUrl.startsWith('/uploads')}
                                    />
                                ) : asset.imageUrl && imgError ? (
                                    <img
                                        src={asset.imageUrl}
                                        alt={asset.name}
                                        className="object-cover w-full h-full relative z-10"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                        }}
                                    />
                                ) : null}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight break-words">{asset.name}</h1>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] md:text-[10px] uppercase font-bold tracking-wider border whitespace-nowrap ${asset.status === 'active'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                        }`}>
                                        {asset.status}
                                    </span>
                                </div>
                                <Link href="/" className="inline-flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-white transition-colors mb-4 mt-2 group w-fit">
                                    <ArrowLeft className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
                                    <span>Back to Markets</span>
                                </Link>
                                <div className="flex items-center gap-4 text-[10px] md:text-sm text-zinc-400 font-medium mt-1">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                                        <Clock className="w-3 h-3 md:w-4 md:h-4 text-zinc-500" />
                                        Vol: <span className="text-zinc-200">${asset.volume24h.toLocaleString()}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                                        <Users className="w-3 h-3 md:w-4 md:h-4 text-zinc-500" />
                                        Holders: <span className="text-zinc-200">{asset.holders || 0}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-end justify-between md:flex-col md:items-end gap-2 bg-black/20 p-3 md:p-0 rounded-xl md:bg-transparent border border-white/5 md:border-0">
                        <div className="text-xl md:text-4xl font-bold text-white tracking-tighter tabular-nums">
                            ${asset.price.toFixed(2)}
                            {asset.status === 'funding' && <span className="text-xs md:text-lg text-yellow-500 font-normal ml-2">(Funding)</span>}
                        </div>
                        <div className={`text-sm md:text-base font-medium flex items-center gap-1.5 ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {asset.change24h >= 0 ? <TrendingUp className="w-3 h-3 md:w-4 md:h-4" /> : <TrendingUp className="w-3 h-3 md:w-4 md:h-4 rotate-180" />}
                            {(asset.change24h > 0 ? '+' : '') + asset.change24h.toFixed(2)}%
                        </div>
                    </div>
                </div>

                {/* Chart Container */}
                <div className="h-[300px] md:h-[400px] lg:h-[500px] glass-panel rounded-2xl overflow-hidden relative group shadow-2xl">
                    {chartData.length > 0 ? (
                        <AssetChart
                            data={chartData}
                            price={asset.price}
                            marketPrice={asset.marketPrice}
                            colors={{
                                lineColor: asset.change24h >= 0 ? '#34d399' : '#f43f5e',
                                areaTopColor: asset.change24h >= 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                areaBottomColor: 'rgba(0, 0, 0, 0)',
                                textColor: '#71717a',
                            }}
                            priceLines={{
                                entry: asset.userPosition && asset.userPosition.shares !== 0 ? asset.userPosition.avgPrice : undefined,
                                stopLoss: orderStopLoss ? parseFloat(orderStopLoss) : null,
                                takeProfit: orderTakeProfit ? parseFloat(orderTakeProfit) : null,
                            }}
                            onUpdatePosition={handleChartUpdate}
                            side={asset.userPosition && asset.userPosition.shares < 0 ? 'sell' : 'buy'}
                            activePositionId={activePositionId}
                            onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-sm tracking-wider">
                            AWAITING_PRICE_DATA...
                        </div>
                    )}
                </div>

                {/* Asset Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
                    <div className="glass-card p-3 md:p-4 rounded-xl hover:bg-white/5 transition-colors">
                        <span className="text-[10px] text-zinc-500 block mb-0.5 md:mb-1 uppercase tracking-wider font-semibold">Market Cap</span>
                        <span className="text-xs md:text-sm font-bold text-white font-mono">${(asset.marketCap / 1000000).toFixed(2)}M</span>
                    </div>
                    <div className="glass-card p-3 md:p-4 rounded-xl hover:bg-white/5 transition-colors">
                        <span className="text-[10px] text-zinc-500 block mb-0.5 md:mb-1 uppercase tracking-wider font-semibold">Liquidity</span>
                        <span className="text-xs md:text-sm font-bold text-white font-mono">${asset.liquidity.toLocaleString()}</span>
                    </div>
                    <div className="glass-card p-3 md:p-4 rounded-xl hover:bg-white/5 transition-colors">
                        <span className="text-[10px] text-zinc-500 block mb-0.5 md:mb-1 uppercase tracking-wider font-semibold">Supply</span>
                        <span className="text-xs md:text-sm font-bold text-white font-mono">{(asset.totalSupply / 1000).toFixed(1)}K</span>
                    </div>
                    <div className="glass-card p-3 md:p-4 rounded-xl hover:bg-white/5 transition-colors">
                        <span className="text-[10px] text-zinc-500 block mb-0.5 md:mb-1 uppercase tracking-wider font-semibold">24h Range</span>
                        <span className="text-[10px] md:text-sm font-bold text-white font-mono whitespace-nowrap">
                            {asset.low24h && asset.high24h ? `$${asset.low24h.toFixed(1)}-$${asset.high24h.toFixed(1)}` : '-- / --'}
                        </span>
                    </div>
                </div>

                {/* Description */}
                {asset.description && (
                    <div className="glass-panel p-6 rounded-xl">
                        <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            About this Market
                        </h4>
                        <p className="text-sm text-zinc-400 leading-relaxed">
                            {asset.description}
                        </p>
                    </div>
                )}

                {/* AI Terminal */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-blue-500" />
                        AI Market Analysis
                    </h3>
                    <AITerminal logs={oracleLogs} />
                </div>
            </div>

            {/* Main Sidebar - Desktop Only (lg:block) */}
            <div className="hidden lg:block lg:col-span-4 lg:fixed lg:right-0 lg:top-0 lg:h-screen lg:w-[33.3333%] border-l border-white/5 bg-zinc-900/40 backdrop-blur-3xl shadow-[-20px_0_30px_rgba(0,0,0,0.1)] z-20">
                <div className="h-full pt-36 px-6 py-6 overflow-y-auto custom-scrollbar">
                    {asset && (
                        <TradingSidebar
                            assetId={asset.id}
                            assetName={asset.name}
                            assetPrice={asset.price}
                            marketPrice={asset.marketPrice}
                            status={asset.status}
                            onTradeSuccess={refreshData}
                            activePositionId={activePositionId}
                            onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                        />
                    )}
                </div>
            </div>

            {/* Mobile Bottom Sheet Social/Trade - Native Pattern */}
            {mounted && createPortal(
                <AnimatePresence>
                    {isMobileTradeOpen && (
                        <div className="fixed inset-0 z-[100] md:hidden flex flex-col justify-end">
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsMobileTradeOpen(false)}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            />

                            {/* Bottom Sheet */}
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
                                className="relative bg-obsidian-950 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] rounded-t-[32px] w-full max-h-[90dvh] flex flex-col overflow-hidden"
                            >
                                {/* Handle Bar */}
                                <div className="h-1.5 w-12 bg-white/20 rounded-full mx-auto mt-3 mb-1" />

                                {/* Header */}
                                <div className="px-6 py-4 flex items-center justify-between border-b border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-xl">
                                            <Zap className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg leading-tight">Trading Desk</h3>
                                            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">{asset.name}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsMobileTradeOpen(false)}
                                        className="p-2 rounded-full bg-white/5 text-zinc-400"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto px-2 py-4 pb-12">
                                    <TradingSidebar
                                        assetId={asset.id}
                                        assetName={asset.name}
                                        assetPrice={asset.price}
                                        marketPrice={asset.marketPrice}
                                        status={asset.status}
                                        onTradeSuccess={() => {
                                            refreshData();
                                            // Optional: close on success for better UX
                                        }}
                                        activePositionId={activePositionId}
                                        onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                                    />
                                </div>

                                {/* Safe Area Spacer for Bottom Nav */}
                                <div className="h-20 flex-shrink-0" />
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
