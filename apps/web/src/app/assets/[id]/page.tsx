'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { SubNavbar } from '@/components/layout/SubNavbar';
import { AssetChart } from '@/components/assets/AssetChart';
import { AITerminal } from '@/components/assets/AITerminal';
import { OrderForm } from '@/components/trade/OrderForm';
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
                    setAsset(data.asset);
                    setOracleLogs(data.oracleLogs || []);
                    setPriceHistory(data.priceHistory || []);
                }
            } catch (error) {
                console.error('Failed to load asset', error);
            } finally {
                setLoading(false);
            }
        }
        fetchAsset();
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

    const chartData = priceHistory.map(p => ({
        time: new Date(p.timestamp).toISOString().split('T')[0], // Lightweight charts likes YYYY-MM-DD for simpler handling or unix timestamp
        value: p.price
    }));

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
                    {/* LEFT COLUMN (Chart & Analysis) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    {asset.imageUrl && (
                                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{asset.name}</h1>
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border ${asset.status === 'active'
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
                            <div className="text-right">
                                <div className="text-4xl font-bold text-white tracking-tighter mb-1 flex items-center justify-end gap-2">
                                    ${(asset.status === 'funding' ? 0 : asset.price).toFixed(2)}
                                    {asset.status === 'funding' && <span className="text-lg text-yellow-500 font-normal">(Funding Phase)</span>}
                                </div>
                                <div className={`text-base font-medium flex items-center justify-end gap-1.5 ${asset.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {asset.change24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingUp className="w-4 h-4 rotate-180" />}
                                    {asset.status === 'funding' ? '0.00' : (asset.change24h > 0 ? '+' : '') + asset.change24h.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        {/* Chart Container */}
                        <div className="h-[500px] bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-2xl overflow-hidden relative group shadow-2xl">
                            <div className="absolute top-4 left-4 z-10 flex gap-2">
                                {['1H', '24H', '7D', 'ALL'].map(time => (
                                    <button
                                        key={time}
                                        className="px-3 py-1.5 bg-black/40 hover:bg-white/10 text-xs font-medium text-zinc-400 hover:text-white rounded-lg border border-white/5 transition-all backdrop-blur-md"
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                            {chartData.length > 0 ? (
                                <AssetChart
                                    data={chartData}
                                    colors={{
                                        lineColor: asset.change24h >= 0 ? '#34d399' : '#f43f5e',
                                        areaTopColor: asset.change24h >= 0 ? 'rgba(52, 211, 153, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                        areaBottomColor: 'rgba(0, 0, 0, 0)',
                                        textColor: '#71717a',
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
                            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl hover:bg-zinc-900/80 transition-colors">
                                <span className="text-xs text-zinc-500 block mb-1 uppercase tracking-wider font-semibold">Market Cap</span>
                                <span className="text-sm font-bold text-white font-mono">${(asset.marketCap / 1000000).toFixed(2)}M</span>
                            </div>
                            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl hover:bg-zinc-900/80 transition-colors">
                                <span className="text-xs text-zinc-500 block mb-1 uppercase tracking-wider font-semibold">Liquidity</span>
                                <span className="text-sm font-bold text-white font-mono">${asset.liquidity.toLocaleString()}</span>
                            </div>
                            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl hover:bg-zinc-900/80 transition-colors">
                                <span className="text-xs text-zinc-500 block mb-1 uppercase tracking-wider font-semibold">Total Supply</span>
                                <span className="text-sm font-bold text-white font-mono">{(asset.totalSupply / 1000).toFixed(1)}K</span>
                            </div>
                            <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl hover:bg-zinc-900/80 transition-colors">
                                <span className="text-xs text-zinc-500 block mb-1 uppercase tracking-wider font-semibold">24h Range</span>
                                <span className="text-sm font-bold text-white font-mono">
                                    {asset.low24h && asset.high24h ? `$${asset.low24h.toFixed(2)} - $${asset.high24h.toFixed(2)}` : '-- / --'}
                                </span>
                            </div>
                        </div>

                        {/* Description (Moved from Right Col) */}
                        {asset.description && (
                            <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-xl">
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

                    {/* RIGHT COLUMN (Order Form Only) */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Order Form */}
                        <OrderForm assetId={asset.id} assetPrice={asset.status === 'funding' ? 0 : asset.price} assetSymbol={asset.name} />
                    </div>
                </div>
            </main>
        </div>
    );
}
