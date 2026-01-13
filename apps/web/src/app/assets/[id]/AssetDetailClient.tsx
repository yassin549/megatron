'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, X, Plus, Brain } from 'lucide-react';
import { AssetChart } from '@/components/assets/AssetChart';
import { AITerminal } from '@/components/assets/AITerminal';
import { TradingSidebar } from '@/components/trade/TradingSidebar';
import {
    Activity,
    TrendingUp,
    Zap
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

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

    return (
        <div className="min-h-screen bg-background relative selection:bg-primary/20 selection:text-primary overflow-hidden">
            {/* Background Effects */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
            <div className="fixed inset-0 bg-[radial-gradient(circle_800px_at_50%_-20%,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-screen relative z-10">
                {/* LEFT COLUMN - Main Content */}
                <div className="lg:col-span-8 flex flex-col h-screen relative border-r border-white/5 bg-black/20">

                    {/* TOP NAVIGATION & TAB TOGGLE */}
                    <div className="h-[72px] border-b border-white/5 px-6 md:px-10 flex items-center justify-between gap-6 z-30 shrink-0">
                        <div className="flex items-center gap-6">
                            <Link href="/" className="p-2.5 text-zinc-500 hover:text-white transition-all bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/10 active:scale-95 group">
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                            </Link>

                            {/* Main Tab Switch */}
                            <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 relative w-[240px] md:w-[320px] shadow-inner">
                                <motion.div
                                    className="absolute inset-y-1 bg-zinc-800 rounded-lg shadow-sm border border-white/5"
                                    initial={false}
                                    animate={{
                                        left: activeTab === 'chart' ? '4px' : 'calc(50%)',
                                        width: 'calc(50% - 4px)'
                                    }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                />
                                <button
                                    onClick={() => setActiveTab('chart')}
                                    className={`flex-1 py-1.5 text-[10px] font-black tracking-widest relative z-10 transition-all uppercase flex items-center justify-center gap-2 ${activeTab === 'chart' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <TrendingUp className={`w-3.5 h-3.5 ${activeTab === 'chart' ? 'opacity-100' : 'opacity-40'}`} />
                                    Market Chart
                                </button>
                                <button
                                    onClick={() => setActiveTab('analysis')}
                                    className={`flex-1 py-1.5 text-[10px] font-black tracking-widest relative z-10 transition-all uppercase flex items-center justify-center gap-2 ${activeTab === 'analysis' ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <Activity className={`w-3.5 h-3.5 ${activeTab === 'analysis' ? 'opacity-100' : 'opacity-40'}`} />
                                    Neural Logs
                                </button>
                            </div>
                        </div>

                        {/* Minimalist Metrics */}
                        <div className="hidden md:flex items-center gap-8">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter mb-0.5 opacity-60">Index Price</span>
                                <span className="text-sm font-black text-white tabular-nums leading-none">${asset.price.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter mb-0.5 opacity-60">24h Change</span>
                                <span className={`text-sm font-black tabular-nums leading-none ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* CONTENT AREA - Pure Full-Tab View */}
                    <div className="flex-1 overflow-hidden relative">
                        <AnimatePresence mode="wait">
                            {activeTab === 'chart' ? (
                                <motion.div
                                    key="chart-view"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full"
                                >
                                    {chartData.length > 0 ? (
                                        <AssetChart
                                            data={chartData}
                                            price={asset.price}
                                            marketPrice={asset.marketPrice}
                                            watermarkText={asset.name.toUpperCase()}
                                            colors={{
                                                lineColor: asset.change24h >= 0 ? '#34d399' : '#f43f5e',
                                                areaTopColor: asset.change24h >= 0 ? 'rgba(52, 211, 153, 0.06)' : 'rgba(244, 63, 94, 0.06)',
                                                areaBottomColor: 'rgba(0, 0, 0, 0)',
                                                textColor: '#52525b',
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
                                        <div className="h-full flex flex-col items-center justify-center">
                                            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
                                            <div className="text-zinc-600 font-black text-[9px] tracking-[0.3em] uppercase">Establishing_Relay...</div>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="analysis-view"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-full h-full"
                                >
                                    {/* Pure Terminal Stream - Full Tab */}
                                    <AITerminal logs={oracleLogs} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* RIGHT COLUMN - Trading Sidebar (Desktop) */}
                <div className="hidden lg:block lg:col-span-4 lg:fixed lg:right-0 lg:top-0 lg:h-screen lg:w-[33.3333%] border-l border-white/5 bg-background/10 backdrop-blur-[60px] shadow-[-20px_0_60px_rgba(0,0,0,0.4)] z-40">
                    <div className="h-full pt-[72px] flex flex-col">
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

                {/* Mobile Floating Button */}
                {mounted && createPortal(
                    <>
                        <div className="lg:hidden fixed bottom-6 right-6 z-[60]">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setIsMobileTradeOpen(true)}
                                className="w-16 h-16 bg-primary text-white flex items-center justify-center rounded-[24px] shadow-[0_20px_50px_rgba(59,130,246,0.3)] border border-white/10"
                            >
                                <TrendingUp className="w-7 h-7" />
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full border-2 border-zinc-900 flex items-center justify-center">
                                    <Plus className="w-3 h-3 text-primary" />
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
                                        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[70]"
                                    />
                                    <div className="fixed inset-0 z-[80] flex items-end justify-center pointer-events-none pb-4 px-4">
                                        <motion.div
                                            initial={{ y: "100%" }}
                                            animate={{ y: 0 }}
                                            exit={{ y: "100%" }}
                                            transition={{ type: "spring", stiffness: 350, damping: 35 }}
                                            className="bg-black/95 border border-white/10 shadow-3xl rounded-[48px] w-full max-w-[480px] flex flex-col pointer-events-auto overflow-hidden relative max-h-[92vh]"
                                        >
                                            <div className="p-10 pb-4 flex items-center justify-between border-b border-white/5">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-3 bg-primary/10 rounded-2xl border border-primary/20">
                                                        <Zap className="w-6 h-6 text-primary" />
                                                    </div>
                                                    <h3 className="font-black text-white text-xl tracking-tighter uppercase italic">Terminal</h3>
                                                </div>
                                                <button onClick={() => setIsMobileTradeOpen(false)} className="p-3 rounded-2xl bg-white/5 text-zinc-500 transition-colors hover:text-white">
                                                    <X className="w-6 h-6" />
                                                </button>
                                            </div>

                                            <div className="flex-1 overflow-y-auto px-4 pb-8 custom-scrollbar">
                                                <TradingSidebar
                                                    assetId={asset.id}
                                                    assetName={asset.name}
                                                    assetPrice={asset.price}
                                                    marketPrice={asset.marketPrice}
                                                    status={asset.status}
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
        </div>
    );
}
