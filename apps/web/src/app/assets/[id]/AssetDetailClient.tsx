'use client';

import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowLeft, X, Plus } from 'lucide-react';
import { AssetChart } from '@/components/assets/AssetChart';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';
import { OrderBook } from '@/components/assets/OrderBook';
import { AssetInfoWidget } from '@/components/assets/AssetProfileWidget';
import { TradingSidebar } from '@/components/trade/TradingSidebar';
import {
    TrendingUp,
    Zap
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeAssetData } from '@/hooks/useRealtimeAssetData';

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
    pricingParams?: { P0: number; k: number };
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
    const { price: livePrice, pressure: livePressure, lastTick } = useRealtimeAssetData(initialAsset.id, initialAsset.price);
    const [asset, setAsset] = useState<Asset>(initialAsset);
    const [oracleLogs, setOracleLogs] = useState<OracleLog[]>(initialOracleLogs);
    const [priceHistory, setPriceHistory] = useState<PricePoint[]>(initialPriceHistory);

    // SL/TP state
    const [orderStopLoss, setOrderStopLoss] = useState(initialAsset.userPosition?.stopLoss?.toString() || '');
    const [orderTakeProfit, setOrderTakeProfit] = useState(initialAsset.userPosition?.takeProfit?.toString() || '');
    const [isUpdatingTargets, setIsUpdatingTargets] = useState(false);
    const [activePositionId, setActivePositionId] = useState<string | null>(null);
    const [isMobileTradeOpen, setIsMobileTradeOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'chart' | 'orderbook' | 'oracle' | 'trade'>('chart');
    const [executionEst, setExecutionEst] = useState<number>(initialAsset.price);
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
                setOracleLogs(Array.isArray(data.oracleLogs) ? data.oracleLogs : []);
                setPriceHistory(data.priceHistory);

                if (!isUpdatingTargets) {
                    if (data.asset.userPosition && data.asset.userPosition.shares !== 0) {
                        setOrderStopLoss(data.asset.userPosition.stopLoss?.toString() || '');
                        setOrderTakeProfit(data.asset.userPosition.takeProfit?.toString() || '');
                        if (!activePositionId) setActivePositionId(data.asset.id);
                    } else {
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
        // Fallback polling (less frequent now)
        const interval = setInterval(refreshData, 60000);
        return () => clearInterval(interval);
    }, [asset.id]);

    // Update reactive state when lastTick arrives
    useEffect(() => {
        if (!lastTick) return;
        setAsset(prev => ({
            ...prev,
            price: livePrice,
            // Volume and change might need more data, but price is key
        }));

        // Append to price history for the chart
        if (lastTick.priceDisplay) {
            setPriceHistory(prev => [...prev, {
                timestamp: lastTick.timestamp || new Date().toISOString(),
                price: Number(lastTick.priceDisplay)
            }]);
        }
    }, [lastTick, livePrice]);

    const { showNotification } = useNotification();

    const handleChartUpdate = async (updates: Partial<Record<'stopLoss' | 'takeProfit', number | null>>) => {
        const entryPrice = asset.userPosition?.avgPrice || 0;
        const isLong = (asset.userPosition?.shares || 0) > 0;

        const slValue = 'stopLoss' in updates ? updates.stopLoss! : (orderStopLoss ? parseFloat(orderStopLoss) : null);
        const tpValue = 'takeProfit' in updates ? updates.takeProfit! : (orderTakeProfit ? parseFloat(orderTakeProfit) : null);

        try {
            for (const [type, value] of Object.entries(updates)) {
                if (value !== null) {
                    if (isLong) {
                        if (type === 'stopLoss' && value >= entryPrice) throw new Error('SL must be below Entry Price.');
                        if (type === 'takeProfit' && value <= entryPrice) throw new Error('TP must be above Entry Price.');
                    } else if ((asset.userPosition?.shares || 0) < 0) {
                        if (type === 'stopLoss' && value <= entryPrice) throw new Error('SL must be above Entry Price.');
                        if (type === 'takeProfit' && value >= entryPrice) throw new Error('TP must be below Entry Price.');
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
                showNotification('success', 'Targets updated');
            }
        } catch (err: any) {
            showNotification('error', err.message);
        } finally {
            setIsUpdatingTargets(false);
        }
    };

    const chartData = (priceHistory || [])
        .map(p => {
            let time = 0;
            try {
                const d = new Date(p.timestamp);
                time = isNaN(d.getTime()) ? 0 : Math.floor(d.getTime() / 1000);
            } catch (e) { }

            return {
                time: time as any,
                value: Number(p.price || 0),
                volume: Number((p as any).volume || 0)
            };
        })
        .filter(d => d.time > 0)
        .sort((a, b) => (a.time as number) - (b.time as number))
        .filter((item, index, self) =>
            index === 0 || item.time !== self[index - 1].time
        );

    const DesktopView = () => (
        <div className="hidden lg:grid grid-cols-12 h-full relative z-10 overflow-hidden">
            {/* LEFT COLUMN - Main Content */}
            <div className="lg:col-span-8 flex flex-col h-full relative border-r border-white/5 bg-black/10 overflow-hidden">
                {/* TOP NAVIGATION & TAB TOGGLE - Fixed Height */}
                <div className="h-[58px] border-b border-white/5 px-6 md:px-10 flex items-center relative z-30 shrink-0">
                    <div className="flex-1 flex justify-start">
                        <Link href="/" className="p-2.5 text-zinc-500 hover:text-white transition-all bg-white/[0.03] border border-white/5 rounded-2xl hover:bg-white/10 active:scale-95 group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <div className="flex-1 flex justify-end">
                        <div className="hidden md:flex items-center gap-8">
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter mb-0.5 opacity-60">Index Price</span>
                                <span className="text-sm font-black text-white tabular-nums leading-none">${Number(livePrice || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-zinc-500 uppercase font-black tracking-tighter mb-0.5 opacity-60">24h Change</span>
                                <span className={`text-sm font-black tabular-nums leading-none ${Number(asset.change24h || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {Number(asset.change24h || 0) >= 0 ? '+' : ''}{Number(asset.change24h || 0).toFixed(2)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-hidden relative">
                    <div className="w-full h-full flex overflow-hidden p-3 gap-3">
                        {/* Left Sidebar (AssetInfoWidget + OrderBook) */}
                        <div className="hidden lg:flex lg:w-[350px] max-w-[350px] flex-shrink-0 flex-col gap-3 pr-3 overflow-hidden">
                            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
                                <AssetInfoWidget
                                    name={asset.name}
                                    imageUrl={asset.imageUrl}
                                    type={asset.type}
                                    oracleLogs={oracleLogs}
                                />
                                <div className="flex-1 min-h-0">
                                    <OrderBook assetId={asset.id} assetPrice={livePrice} />
                                </div>
                            </div>
                        </div>

                        {/* Right Chart */}
                        <div className="flex-1 overflow-hidden flex flex-col bg-black/40 border border-white/5 rounded-2xl shadow-2xl">
                            {chartData.length > 0 ? (
                                <ErrorBoundary name="Market Chart">
                                    <AssetChart
                                        data={chartData}
                                        marginalPrice={livePrice}
                                        marketPrice={asset.marketPrice}
                                        watermarkText={asset.name.toUpperCase()}
                                        colors={useMemo(() => ({
                                            lineColor: asset.change24h >= 0 ? '#10b981' : '#f43f5e',
                                            areaTopColor: asset.change24h >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                                            areaBottomColor: asset.change24h >= 0 ? 'rgba(16, 185, 129, 0)' : 'rgba(244, 63, 94, 0)',
                                            textColor: '#52525b',
                                        }), [asset.change24h])}
                                        priceLines={{
                                            entry: asset.userPosition && asset.userPosition.shares !== 0 ? asset.userPosition.avgPrice : undefined,
                                            stopLoss: orderStopLoss ? parseFloat(orderStopLoss) : null,
                                            takeProfit: orderTakeProfit ? parseFloat(orderTakeProfit) : null,
                                        }}
                                        userTrades={asset.userTrades}
                                        onUpdatePosition={handleChartUpdate}
                                        side={asset.userPosition && asset.userPosition.shares < 0 ? 'sell' : 'buy'}
                                        activePositionId={activePositionId}
                                        onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                                    />
                                </ErrorBoundary>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center">
                                    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
                                    <div className="text-zinc-600 font-black text-[9px] tracking-[0.3em] uppercase">Establishing_Relay...</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN - Trading Panel */}
            <div className="hidden lg:block lg:col-span-4 h-full border-l border-white/5 bg-background/10 backdrop-blur-[60px] shadow-[-20px_0_60px_rgba(0,0,0,0.4)] z-40 overflow-hidden">
                <div className="h-full flex flex-col">
                    <TradingSidebar
                        assetId={asset.id}
                        assetName={asset.name}
                        assetPrice={livePrice}
                        marketPrice={asset.marketPrice}
                        totalSupply={asset.totalSupply}
                        pricingParams={asset.pricingParams}
                        sidebarContext="desktop"
                        status={asset.status}
                        stats={{
                            marketCap: asset.marketCap,
                            liquidity: asset.liquidity,
                            supply: asset.totalSupply,
                            low24h: asset.low24h,
                            high24h: asset.high24h
                        }}
                        onTradeSuccess={refreshData}
                        onExecutionPriceChange={setExecutionEst}
                        activePositionId={activePositionId}
                        onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                    />
                </div>
            </div>
        </div>
    );

    const MobileView = () => (
        <div className="lg:hidden fixed inset-0 flex flex-col bg-background pt-[58px] pb-20">
            {/* Header Area */}
            <div className="h-[58px] fixed top-0 left-0 right-0 border-b border-white/5 px-6 flex items-center bg-background/80 backdrop-blur-xl z-50">
                <Link href="/" className="p-2 text-zinc-500 hover:text-white transition-all bg-white/[0.03] border border-white/5 rounded-xl">
                    <ArrowLeft className="w-4 h-4" />
                </Link>
                <div className="flex-1 px-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none mb-0.5">{asset.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-white leading-none tabular-nums">${Number(livePrice || 0).toFixed(2)}</span>
                            <span className={`text-[10px] font-bold ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                            </span>
                        </div>
                    </div>
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Content Area - Scrollable but contains fixed-height content based on tab */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab Bar Integration */}
                <div className="px-6 py-4 shrink-0">
                    <div className="flex bg-white/[0.03] border border-white/5 rounded-[20px] p-1.5 backdrop-blur-xl shadow-2xl">
                        {(['chart', 'book', 'oracle', 'trade'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab === 'book' ? 'orderbook' : tab as any)}
                                className={`relative flex-1 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-[14px] ${(activeTab === 'orderbook' ? 'book' : activeTab) === tab ? 'text-white' : 'text-zinc-600'
                                    }`}
                            >
                                {(activeTab === 'orderbook' ? 'book' : activeTab) === tab && (
                                    <motion.div
                                        layoutId="mobile-active-tab"
                                        className="absolute inset-0 bg-white/5 border border-white/10 rounded-[14px] shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                        transition={{ type: 'spring', bounce: 0.1, duration: 0.4 }}
                                    />
                                )}
                                <span className="relative z-10">{tab}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content Pane */}
                <div className="flex-1 overflow-hidden px-4 pb-4">
                    <AnimatePresence mode="wait">
                        {activeTab === 'chart' && (
                            <motion.div
                                key="chart"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full h-full bg-black/40 border border-white/5 rounded-[32px] overflow-hidden shadow-2xl relative"
                            >
                                {chartData.length > 0 ? (
                                    <AssetChart
                                        data={chartData}
                                        marginalPrice={livePrice}
                                        marketPrice={asset.marketPrice}
                                        watermarkText={asset.name.toUpperCase()}
                                        colors={useMemo(() => ({
                                            lineColor: asset.change24h >= 0 ? '#10b981' : '#f43f5e',
                                            areaTopColor: asset.change24h >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                                            areaBottomColor: asset.change24h >= 0 ? 'rgba(16, 185, 129, 0)' : 'rgba(244, 63, 94, 0)',
                                            textColor: '#52525b',
                                        }), [asset.change24h])}
                                        priceLines={{
                                            entry: asset.userPosition && asset.userPosition.shares !== 0 ? asset.userPosition.avgPrice : undefined,
                                            stopLoss: orderStopLoss ? parseFloat(orderStopLoss) : null,
                                            takeProfit: orderTakeProfit ? parseFloat(orderTakeProfit) : null,
                                        }}
                                        userTrades={asset.userTrades}
                                        onUpdatePosition={handleChartUpdate}
                                        side={asset.userPosition && asset.userPosition.shares < 0 ? 'sell' : 'buy'}
                                        activePositionId={activePositionId}
                                        onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                                    />
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center">
                                        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
                                        <div className="text-zinc-600 font-black text-[9px] tracking-[0.3em] uppercase">Booting_Terminal...</div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'orderbook' && (
                            <motion.div
                                key="orderbook"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full h-full bg-black/40 border border-white/5 rounded-[32px] overflow-hidden flex flex-col p-4"
                            >
                                <OrderBook assetId={asset.id} assetPrice={livePrice} />
                            </motion.div>
                        )}

                        {activeTab === 'oracle' && (
                            <motion.div
                                key="oracle"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full h-full bg-black/40 border border-white/5 rounded-[32px] overflow-hidden flex flex-col"
                            >
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 font-mono text-xs">
                                    {oracleLogs.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-600">
                                            <Zap className="w-6 h-6 mb-4 animate-pulse" />
                                            <span className="font-black uppercase tracking-[0.2em] text-[10px]">Awaiting_Signal...</span>
                                        </div>
                                    ) : (
                                        oracleLogs.map((log) => (
                                            <div key={log.id} className="border-l-2 border-primary/40 pl-4 py-3 bg-white/[0.02] rounded-r-xl">
                                                <div className="flex items-center gap-3 mb-1.5 opacity-60">
                                                    <span className="text-[9px] font-bold">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                                                    <span className={`font-black ${log.deltaPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {log.deltaPercent >= 0 ? '+' : ''}{log.deltaPercent.toFixed(2)}%
                                                    </span>
                                                </div>
                                                <p className="text-white font-bold leading-relaxed pr-2">{log.summary}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 bg-black/20 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Neural Oracle Link Status: Active</span>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'trade' && (
                            <motion.div
                                key="trade"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-full h-full bg-black/40 border border-white/5 rounded-[32px] overflow-hidden flex flex-col"
                            >
                                <div className="flex-1 overflow-y-auto px-1 custom-scrollbar">
                                    <TradingSidebar
                                        assetId={asset.id}
                                        assetName={asset.name}
                                        assetPrice={livePrice}
                                        marketPrice={asset.marketPrice}
                                        status={asset.status}
                                        sidebarContext="mobile-integrated"
                                        totalSupply={asset.totalSupply}
                                        pricingParams={asset.pricingParams}
                                        onTradeSuccess={refreshData}
                                        onExecutionPriceChange={setExecutionEst}
                                        activePositionId={activePositionId}
                                        onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Reproportioned Bottom Action Button */}
            <div className="fixed bottom-[108px] left-0 right-0 px-6 z-40 pointer-events-none">
                <div className="max-w-[480px] mx-auto pointer-events-auto">
                    <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setActiveTab('trade')}
                        className={`w-full h-14 bg-primary relative overflow-hidden rounded-2xl group flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(59,130,246,0.3)] border border-white/10 ${activeTab === 'trade' ? 'hidden' : 'block'
                            }`}
                    >
                        <TrendingUp className="w-5 h-5 text-white" />
                        <span className="text-xs font-black text-white uppercase tracking-[0.2em] italic">Open Trade Interface</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse ml-1" />
                    </motion.button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="h-[calc(100vh-64px)] w-full bg-background relative selection:bg-primary/20 selection:text-primary overflow-hidden">
            <DesktopView />
            <MobileView />
        </div>
    );
}
