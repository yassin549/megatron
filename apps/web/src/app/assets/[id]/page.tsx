'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { SubNavbar } from '@/components/layout/SubNavbar';
import { AssetChart } from '@/components/assets/AssetChart';
import { AITerminal } from '@/components/assets/AITerminal';
import { OrderForm } from '@/components/trade/OrderForm';
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

    useEffect(() => {
        async function fetchAsset() {
            try {
                const res = await fetch(`/api/assets/${params.id}`);
                if (res.ok) {
                    const data = await res.json();

                    // Only update if data has changed (simple check)
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

        fetchAsset();
        const interval = setInterval(fetchAsset, 10000); // Poll every 10 seconds
        return () => clearInterval(interval);
    }, [params.id]);

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
            time: Math.floor(new Date(p.timestamp).getTime() / 1000) as any, // Remove manual offset, rely on browser localization
            value: p.price
        }))
        .sort((a, b) => (a.time as number) - (b.time as number))
        .filter((item, index, self) =>
            // Unique timestamps only
            index === 0 || item.time !== self[index - 1].time
        );

    // Stagnation logic: If the last price point is older than 2 minutes,
    // add a "current" point to draw a flat line to "now".
    if (chartData.length > 0) {
        const lastPoint = chartData[chartData.length - 1];
        const now = Math.floor(Date.now() / 1000);
        if (now - (lastPoint.time as number) > 60) {
            chartData.push({ time: now as any, value: lastPoint.value });
        }
    }

    return (
        <div className="min-h-screen bg-background text-gray-200 selection:bg-blue-500/30">
            <SubNavbar />

            <main className="max-w-[1400px] mx-auto px-4 py-8 pb-32 md:pb-8">
                {/* Back Link */}
                <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-8 transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Markets
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LEFT COLUMN (Chart & Analysis) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Header */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    {asset.imageUrl && (
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight break-words">{asset.name}</h1>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border whitespace-nowrap ${asset.status === 'active'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                        : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                        }`}>
                                        {asset.status}
                                    </span>
                                </div>
                                <div className="flex items-center gap-6 text-sm text-zinc-400 font-medium">
                                    <span className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-zinc-500" />
                                        24h Vol: <span className="text-zinc-200">${asset.volume24h.toLocaleString()}</span>
                                    </span>
                                    <span className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-zinc-500" />
                                        Holders: <span className="text-zinc-200">{asset.holders || 0}</span>
                                    </span>
                                </div>
                            </div>
                            <div className="text-left md:text-right">
                                <div className="text-4xl font-bold text-white tracking-tighter mb-1 flex items-center md:justify-end gap-2">
                                    ${asset.price.toFixed(2)}
                                    {asset.status === 'funding' && <span className="text-lg text-yellow-500 font-normal">(Funding Phase)</span>}
                                </div>
                                <div className={`text-base font-medium flex items-center md:justify-end gap-1.5 ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {asset.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
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
                                    onTimeframeChange={(tf) => {
                                        console.log('Fetching data for timeframe:', tf);
                                    }}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-sm tracking-wider">
                                    AWAITING_PRICE_DATA...
                                </div>
                            )}
                        </div>

                        {/* Asset Stats Grid (Moved from Right Col) */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="glass-card p-4 rounded-xl hover:bg-white/5 transition-colors">
                                <span className="text-xs text-zinc-500 block mb-1 uppercase tracking-wider font-semibold">Market Cap</span>
                                <span className="text-sm font-bold text-white font-mono">${(asset.marketCap / 1000000).toFixed(2)}M</span>
                            </div>
                            <div className="glass-card p-4 rounded-xl hover:bg-white/5 transition-colors">
                                <span className="text-xs text-zinc-500 block mb-1 uppercase tracking-wider font-semibold">Liquidity</span>
                                <span className="text-sm font-bold text-white font-mono">${asset.liquidity.toLocaleString()}</span>
                            </div>
                            <div className="glass-card p-4 rounded-xl hover:bg-white/5 transition-colors">
                                <span className="text-xs text-zinc-500 block mb-1 uppercase tracking-wider font-semibold">Total Supply</span>
                                <span className="text-sm font-bold text-white font-mono">{(asset.totalSupply / 1000).toFixed(1)}K</span>
                            </div>
                            <div className="glass-card p-4 rounded-xl hover:bg-white/5 transition-colors">
                                <span className="text-xs text-zinc-500 block mb-1 uppercase tracking-wider font-semibold">24h Range</span>
                                <span className="text-sm font-bold text-white font-mono">
                                    {asset.low24h && asset.high24h ? `$${asset.low24h.toFixed(2)} - $${asset.high24h.toFixed(2)}` : '-- / --'}
                                </span>
                            </div>
                        </div>

                        {/* Description (Moved from Right Col) */}
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

                    {/* RIGHT COLUMN (Order Form or LP Funding Panel) */}
                    <div className="lg:col-span-4 space-y-6">
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
                            <OrderForm assetId={asset.id} assetPrice={asset.price} assetSymbol={asset.name} />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
