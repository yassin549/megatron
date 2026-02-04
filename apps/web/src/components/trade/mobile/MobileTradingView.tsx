'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MobileHeader } from './MobileHeader';
import { MobileTabBar, MobileTab } from './MobileTabBar';
import { MobileChart } from './MobileChart';
import { MobileOrderBook } from './MobileOrderBook';
import { MobileOracleTerminal } from './MobileOracleTerminal';
import { MobileStatsPanel } from './MobileStatsPanel';
import { MobileOrderPanel } from './MobileOrderPanel';

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

    return (
        <div className="lg:hidden fixed inset-0 flex flex-col bg-[#09090b]">
            {/* Header */}
            <MobileHeader
                assetName={asset.name}
                price={livePrice}
                change24h={asset.change24h}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col pt-14 pb-48 overflow-hidden">
                {/* Chart Area - Always visible at top */}
                <div className="h-[45%] min-h-[200px] px-3 pt-3">
                    <div className="h-full bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                        <MobileChart
                            data={chartData}
                            marginalPrice={livePrice}
                            marketPrice={asset.marketPrice}
                            change24h={asset.change24h}
                            watermarkText={asset.name.toUpperCase()}
                            priceLines={priceLines}
                            userTrades={asset.userTrades}
                        />
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="py-3">
                    <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden px-3">
                    <div className="h-full bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                        <AnimatePresence mode="wait">
                            {activeTab === 'chart' && (
                                <motion.div
                                    key="chart-info"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full flex flex-col items-center justify-center text-center p-6"
                                >
                                    <p className="text-zinc-500 text-xs">
                                        Pinch to zoom • Drag to pan
                                    </p>
                                    <p className="text-zinc-600 text-[10px] mt-1">
                                        View order book, oracle, or stats below
                                    </p>
                                </motion.div>
                            )}

                            {activeTab === 'book' && (
                                <motion.div
                                    key="book"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full"
                                >
                                    <MobileOrderBook assetId={asset.id} assetPrice={livePrice} />
                                </motion.div>
                            )}

                            {activeTab === 'oracle' && (
                                <motion.div
                                    key="oracle"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full"
                                >
                                    <MobileOracleTerminal oracleLogs={oracleLogs} />
                                </motion.div>
                            )}

                            {activeTab === 'stats' && (
                                <motion.div
                                    key="stats"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.2 }}
                                    className="h-full"
                                >
                                    <MobileStatsPanel stats={stats} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Bottom Order Panel */}
            <MobileOrderPanel
                assetId={asset.id}
                assetPrice={livePrice}
                assetName={asset.name}
                onTradeSuccess={onRefresh}
            />
        </div>
    );
}
