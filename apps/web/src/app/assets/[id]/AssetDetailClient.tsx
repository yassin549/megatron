'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, X, Plus, Brain } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'chart' | 'analysis'>('chart');
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

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen relative overflow-hidden bg-black selection:bg-primary/30">
            {/* LEFT COLUMN - Main Content */}
            <div className="lg:col-span-8 flex flex-col h-screen relative border-r border-white/5">

                {/* TAB NAVIGATION - Sleek Pill Toggle */}
                <div className="h-16 border-b border-white/5 bg-zinc-950/40 backdrop-blur-xl px-4 md:px-8 flex items-center justify-between gap-4 z-30 shrink-0">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 text-zinc-500 hover:text-white transition-all bg-white/5 rounded-xl hover:bg-white/10 active:scale-95 group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>

                        <div className="flex bg-black/60 rounded-xl p-1 border border-white/10 relative w-[240px] md:w-[320px] shadow-inner">
                            <motion.div
                                className="absolute inset-y-1 bg-zinc-800 rounded-lg shadow-xl border border-white/10"
                                initial={false}
                                animate={{
                                    left: activeTab === 'chart' ? '4px' : '50%',
                                    width: 'calc(50% - 4px)'
                                }}
                                transition={{ type: "spring", stiffness: 450, damping: 38 }}
                            />
                            <button
                                onClick={() => setActiveTab('chart')}
                                className={`flex-1 py-1.5 text-[10px] md:text-xs font-black tracking-widest relative z-10 transition-all uppercase flex items-center justify-center gap-2 ${activeTab === 'chart' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <TrendingUp className={`w-3.5 h-3.5 transition-transform ${activeTab === 'chart' ? 'scale-110' : 'scale-100'}`} />
                                <span className="hidden sm:inline">Market</span> Chart
                            </button>
                            <button
                                onClick={() => setActiveTab('analysis')}
                                className={`flex-1 py-1.5 text-[10px] md:text-xs font-black tracking-widest relative z-10 transition-all uppercase flex items-center justify-center gap-2 ${activeTab === 'analysis' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Activity className={`w-3.5 h-3.5 transition-transform ${activeTab === 'analysis' ? 'scale-110' : 'scale-100'}`} />
                                <span className="hidden sm:inline">Neural</span> Analysis
                            </button>
                        </div>
                    </div>

                    {/* Compact Price Display */}
                    <div className="hidden sm:flex items-center gap-6 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-2xl shadow-lg">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter leading-none mb-1">Index Price</span>
                            <span className="text-sm font-black text-white leading-none tabular-nums">${asset.price.toFixed(2)}</span>
                        </div>
                        <div className="w-[1px] h-6 bg-white/10" />
                        <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter leading-none mb-1">24h Change</span>
                            <span className={`text-sm font-black leading-none tabular-nums ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* SCROLLABLE CONTENT AREA */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black relative">
                    <AnimatePresence mode="wait">
                        {activeTab === 'chart' ? (
                            <motion.div
                                key="chart-view"
                                initial={{ opacity: 0, scale: 0.99, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.99, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="flex flex-col h-full"
                            >
                                {/* Chart Container with Overlay Header */}
                                <div className="h-[calc(100vh-64px)] min-h-[500px] relative group bg-zinc-950/20">
                                    {/* INTERNAL CHART HEADER OVERLAY */}
                                    <div className="absolute top-8 left-8 z-20 pointer-events-none">
                                        <div className="flex items-center gap-5 bg-black/60 backdrop-blur-3xl p-5 rounded-[28px] border border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)]">
                                            <div className="w-14 h-14 rounded-2xl border border-white/10 flex-shrink-0 relative overflow-hidden bg-zinc-900/50 flex items-center justify-center p-0.5 shadow-2xl">
                                                <div className="absolute inset-0 flex items-center justify-center text-zinc-800">
                                                    <Icon className="w-8 h-8 opacity-20" />
                                                </div>
                                                {asset.imageUrl && !imgError ? (
                                                    <Image
                                                        src={asset.imageUrl.startsWith('/') ? asset.imageUrl : `/${asset.imageUrl}`}
                                                        alt={asset.name}
                                                        fill
                                                        priority
                                                        className="object-cover rounded-xl relative z-10"
                                                        onError={() => setImgError(true)}
                                                        unoptimized={asset.imageUrl.startsWith('/uploads')}
                                                    />
                                                ) : asset.imageUrl && imgError ? (
                                                    <img
                                                        src={asset.imageUrl}
                                                        alt={asset.name}
                                                        className="object-cover w-full h-full rounded-xl relative z-10"
                                                    />
                                                ) : null}
                                            </div>
                                            <div className="pr-4">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter leading-none">{asset.name}</h1>
                                                    <span className={`px-2 py-0.5 rounded-md text-[8px] uppercase font-black tracking-widest border shadow-lg ${asset.status === 'active'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                                        }`}>
                                                        {asset.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <Activity className="w-3.5 h-3.5 text-zinc-500" />
                                                        <span className="text-sm font-mono font-bold text-zinc-400">Vol: ${(asset.volume24h / 1000).toFixed(1)}K</span>
                                                    </div>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                                                    <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        Real-time
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {chartData.length > 0 ? (
                                        <AssetChart
                                            data={chartData}
                                            price={asset.price}
                                            marketPrice={asset.marketPrice}
                                            colors={{
                                                lineColor: asset.change24h >= 0 ? '#34d399' : '#f43f5e',
                                                areaTopColor: asset.change24h >= 0 ? 'rgba(52, 211, 153, 0.12)' : 'rgba(244, 63, 94, 0.12)',
                                                areaBottomColor: 'rgba(0, 0, 0, 0)',
                                                textColor: '#4b5563',
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
                                        <div className="h-full flex flex-col items-center justify-center bg-black/40">
                                            <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
                                            <div className="text-zinc-600 font-black text-[10px] tracking-[0.4em] uppercase">Syncing_Real-Time_Aggregates...</div>
                                        </div>
                                    )}
                                </div>

                                {/* Context Area (Bottom) */}
                                {asset.description && (
                                    <div className="p-8 md:p-16 bg-neutral-950/80 border-t border-white/5">
                                        <div className="max-w-4xl mx-auto">
                                            <div className="flex flex-col gap-8">
                                                <div className="inline-flex items-center gap-4">
                                                    <div className="w-1.5 h-8 bg-primary rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                                                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">Market Context & Intelligence</h4>
                                                </div>
                                                <p className="text-xl text-zinc-300 font-medium leading-relaxed tracking-tight">
                                                    {asset.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="analysis-view"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="p-6 md:p-12 h-full flex flex-col items-center bg-black"
                            >
                                <div className="max-w-5xl w-full">
                                    <div className="flex items-center justify-between mb-12">
                                        <div className="flex items-center gap-5">
                                            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/10">
                                                <Brain className="w-7 h-7 text-blue-500" />
                                            </div>
                                            <div>
                                                <h3 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none mb-1.5">Neural Oracle</h3>
                                                <span className="text-[11px] text-zinc-500 font-black uppercase tracking-[0.3em]">Real-time probabilistic state verification</span>
                                            </div>
                                        </div>
                                        <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[11px] text-emerald-500 font-black uppercase tracking-widest">Live Integration</span>
                                        </div>
                                    </div>

                                    <div className="glass-panel rounded-[40px] p-1.5 bg-white/[0.01] border border-white/5 shadow-3xl overflow-hidden ring-1 ring-white/[0.05]">
                                        <AITerminal logs={oracleLogs} />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* RIGHT COLUMN - Trading Sidebar (Desktop) */}
            <div className="hidden lg:block lg:col-span-4 lg:fixed lg:right-0 lg:top-0 lg:h-screen lg:w-[33.3333%] border-l border-white/5 bg-zinc-950/20 backdrop-blur-4xl shadow-[-40px_0_80px_rgba(0,0,0,0.6)] z-40">
                <div className="h-full pt-16 flex flex-col">
                    {asset && (
                        <TradingSidebar
                            assetId={asset.id}
                            assetName={asset.name}
                            assetPrice={asset.price}
                            marketPrice={asset.marketPrice}
                            status={asset.status}
                            stats={{
                                marketCap: asset.marketCap,
                                liquidity: asset.liquidity,
                                supply: asset.totalSupply,
                                low24h: asset.low24h,
                                high24h: asset.high24h
                            }}
                            onTradeSuccess={refreshData}
                            activePositionId={activePositionId}
                            onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                        />
                    )}
                </div>
            </div>

            {/* Mobile Fixed Elements */}
            {mounted && createPortal(
                <>
                    {/* Mobile Floating Button */}
                    <div className="lg:hidden fixed bottom-8 right-6 z-[60]">
                        <motion.button
                            initial={{ scale: 0, opacity: 0, rotate: -30 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setIsMobileTradeOpen(true)}
                            className="w-16 h-16 bg-primary text-white flex items-center justify-center rounded-[24px] shadow-[0_24px_48px_rgba(59,130,246,0.5)] border border-white/20 active:bg-blue-600 transition-all font-black"
                        >
                            <TrendingUp className="w-8 h-8" />
                            <div className="absolute -top-1 -right-1 w-6 h-6 bg-black rounded-full border-2 border-zinc-900 flex items-center justify-center shadow-2xl">
                                <Plus className="w-3.5 h-3.5 text-primary" />
                            </div>
                        </motion.button>
                    </div>

                    <AnimatePresence>
                        {isMobileTradeOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsMobileTradeOpen(false)}
                                    className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[70]"
                                />
                                <div className="fixed inset-0 z-[80] flex items-end justify-center pointer-events-none pb-4 px-4 overflow-hidden">
                                    <motion.div
                                        initial={{ y: "100%", opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        exit={{ y: "100%", opacity: 0 }}
                                        transition={{ type: "spring", stiffness: 350, damping: 35 }}
                                        className="bg-black/95 border border-white/10 shadow-[0_-40px_100px_rgba(0,0,0,1)] rounded-[50px] w-full max-w-[480px] flex flex-col pointer-events-auto overflow-hidden relative max-h-[92vh] ring-1 ring-white/10"
                                    >
                                        <div className="p-8 pb-3 flex items-center justify-between border-b border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-primary/10 rounded-2xl border border-primary/20">
                                                    <Zap className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-white text-xl tracking-tighter uppercase italic leading-none mb-1">Trade Desk</h3>
                                                    <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Megatron Terminal v1.0</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setIsMobileTradeOpen(false)}
                                                className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-400 transition-all active:scale-90"
                                            >
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>

                                        <div className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar">
                                            <TradingSidebar
                                                assetId={asset.id}
                                                assetName={asset.name}
                                                assetPrice={asset.price}
                                                marketPrice={asset.marketPrice}
                                                status={asset.status}
                                                stats={{
                                                    marketCap: asset.marketCap,
                                                    liquidity: asset.liquidity,
                                                    supply: asset.totalSupply,
                                                    low24h: asset.low24h,
                                                    high24h: asset.high24h
                                                }}
                                                onTradeSuccess={() => {
                                                    refreshData();
                                                }}
                                                activePositionId={activePositionId}
                                                onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                                            />
                                        </div>
                                    </motion.div>
                                </div>
                            </>
                        )}
                    </AnimatePresence>
                </>,
                document.body
            )}
        </div>
    );
}

