'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { SubNavbar } from '@/components/layout/SubNavbar';
import { AssetChart } from '@/components/assets/AssetChart';
import { AITerminal } from '@/components/assets/AITerminal';
import { OrderForm } from '@/components/trade/OrderForm';
import { PositionCard } from '@/components/trade/PositionCard';
import { LPFundingPanel } from '@/components/trade/LPFundingPanel';
import { ArrowLeft, Clock, Activity, TrendingUp, Users } from 'lucide-react';

interface Asset {
    id: string;
    name: string;
    description: string | null;
    type: string;
    status: 'active' | 'funding' | 'paused';
    price: number;
    change24h: number;
    volume24h: number;
    marketCap: number;
    totalSupply: number;
    liquidity: number;
    softCap: number;
    hardCap: number;
    fundingProgress: number;
    fundingDeadline: string | null;
    oracleQueries: string[];
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
}

interface PricePoint {
    timestamp: string;
    price: number;
}

export default function AssetDetailPage({ params }: { params: { id: string } }) {
    const { data: session } = useSession();
    const [asset, setAsset] = useState<Asset | null>(null);
    const [oracleLogs, setOracleLogs] = useState<OracleLog[]>([]);
    const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUpdatingTargets, setIsUpdatingTargets] = useState(false);
    const [isExitingPosition, setIsExitingPosition] = useState(false);

    // Dynamic SL/TP state for the current order / position update
    const [orderStopLoss, setOrderStopLoss] = useState('');
    const [orderTakeProfit, setOrderTakeProfit] = useState('');
    const [hasInitializedTargets, setHasInitializedTargets] = useState(false);

    async function fetchAsset() {
        try {
            const res = await fetch(`/api/assets/${params.id}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                const newAsset = data.asset as Asset;

                // Sync local targets if not initialized and position exists
                if (!hasInitializedTargets && newAsset.userPosition) {
                    setOrderStopLoss(newAsset.userPosition.stopLoss?.toString() || '');
                    setOrderTakeProfit(newAsset.userPosition.takeProfit?.toString() || '');
                    setHasInitializedTargets(true);
                }

                setAsset(prev => JSON.stringify(prev) !== JSON.stringify(data.asset) ? data.asset : prev);
                setOracleLogs(prev => prev.length !== (data.oracleLogs || []).length ? data.oracleLogs : prev);
                setPriceHistory(data.priceHistory || []);
            }
        } catch (error) {
            console.error('Failed to load asset', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAsset();
        const interval = setInterval(fetchAsset, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, [params.id]);

    const handleUpdateTargets = async () => {
        if (!asset) return;
        setIsUpdatingTargets(true);
        try {
            const slValue = orderStopLoss ? parseFloat(orderStopLoss) : null;
            const tpValue = orderTakeProfit ? parseFloat(orderTakeProfit) : null;
            const res = await fetch('/api/trade/position', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: asset.id, stopLoss: slValue, takeProfit: tpValue }),
            });
            if (res.ok) {
                fetchAsset();
            }
        } catch (err) {
            console.error('Failed to update targets', err);
        } finally {
            setIsUpdatingTargets(false);
        }
    };

    const handleExitPosition = async () => {
        if (!asset?.userPosition) return;
        setIsExitingPosition(true);
        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'sell',
                    assetId: asset.id,
                    shares: asset.userPosition.shares,
                }),
            });
            if (res.ok) {
                setHasInitializedTargets(false);
                fetchAsset();
            }
        } catch (err) {
            console.error('Failed to exit position', err);
        } finally {
            setIsExitingPosition(false);
        }
    };

    const handleChartUpdate = async (type: 'stopLoss' | 'takeProfit', value: number) => {
        if (!asset) return;

        // Update local state immediately
        if (type === 'stopLoss') setOrderStopLoss(value.toString());
        if (type === 'takeProfit') setOrderTakeProfit(value.toString());

        // Prepare payload - use new value for the changed type, current state for the other
        const slValue = type === 'stopLoss' ? value : (orderStopLoss ? parseFloat(orderStopLoss) : null);
        const tpValue = type === 'takeProfit' ? value : (orderTakeProfit ? parseFloat(orderTakeProfit) : null);

        setIsUpdatingTargets(true);
        try {
            const res = await fetch('/api/trade/position', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: asset.id, stopLoss: slValue, takeProfit: tpValue }),
            });
            if (res.ok) {
                fetchAsset();
            }
        } catch (err) {
            console.error('Failed to update targets from chart', err);
        } finally {
            setIsUpdatingTargets(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center font-mono text-gray-500 animate-pulse">
                INITIALIZING_DATA_STREAM...
            </div>
        );
    }

    if (!asset) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
                <h1 className="text-2xl font-bold mb-4">Asset Not Found</h1>
                <Link href="/" className="text-blue-500 hover:underline">Return to Market Grid</Link>
            </div>
        );
    }

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
        <div className="min-h-screen bg-background text-gray-200 selection:bg-blue-500/30">
            <SubNavbar />

            <main className="max-w-[1400px] mx-auto px-4 py-8">
                {/* Back Link */}
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-8 transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Markets
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4 md:mb-0">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-2">
                                    {asset.imageUrl && (
                                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                                            <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
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
                                    colors={{
                                        lineColor: asset.change24h >= 0 ? '#34d399' : '#f43f5e',
                                        areaTopColor: asset.change24h >= 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                        areaBottomColor: 'rgba(0, 0, 0, 0)',
                                        textColor: '#71717a',
                                    }}
                                    priceLines={{
                                        entry: asset.userPosition?.avgPrice,
                                        stopLoss: orderStopLoss ? parseFloat(orderStopLoss) : null,
                                        takeProfit: orderTakeProfit ? parseFloat(orderTakeProfit) : null,
                                    }}
                                    onUpdatePosition={handleChartUpdate}
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

                    {/* RIGHT COLUMN */}
                    <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24 h-fit">
                        {asset.status === 'funding' ? (
                            <LPFundingPanel
                                assetId={asset.id}
                                assetName={asset.name}
                                softCap={asset.softCap}
                                hardCap={asset.hardCap}
                                currentFunding={asset.liquidity}
                                fundingDeadline={asset.fundingDeadline}
                            />
                        ) : (
                            <>
                                <OrderForm
                                    assetId={asset.id}
                                    assetPrice={asset.price}
                                    assetSymbol={asset.name}
                                    onTradeSuccess={fetchAsset}
                                />
                                {/* Position Card - Shows below OrderForm when position exists */}
                                {asset.userPosition && asset.userPosition.shares > 0 && (
                                    <PositionCard
                                        shares={asset.userPosition.shares}
                                        avgPrice={asset.userPosition.avgPrice}
                                        currentPrice={asset.price}
                                        stopLoss={orderStopLoss}
                                        takeProfit={orderTakeProfit}
                                        onStopLossChange={setOrderStopLoss}
                                        onTakeProfitChange={setOrderTakeProfit}
                                        onUpdateTargets={handleUpdateTargets}
                                        onExitPosition={handleExitPosition}
                                        isUpdating={isUpdatingTargets}
                                        isExiting={isExitingPosition}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
