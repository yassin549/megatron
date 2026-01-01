'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
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
    LayoutGrid
} from 'lucide-react';

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
    const [imageError, setImageError] = useState(false);

    // SL/TP state
    const [orderStopLoss, setOrderStopLoss] = useState(initialAsset.userPosition?.stopLoss?.toString() || '');
    const [orderTakeProfit, setOrderTakeProfit] = useState(initialAsset.userPosition?.takeProfit?.toString() || '');
    const [activePositionId, setActivePositionId] = useState<string | null>(null);
    const [previewLines, setPreviewLines] = useState<{ stopLoss?: number | null; takeProfit?: number | null }>({});

    async function refreshData() {
        try {
            window.location.reload();
        } catch (e) {
            console.error(e);
        }
    }

    const handleChartUpdate = async (type: 'stopLoss' | 'takeProfit', price: number) => {
        console.log('Chart update', type, price);
    };

    const chartData = priceHistory.map(p => ({
        time: p.timestamp,
        value: p.price
    })).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    const isPositive = asset.change24h >= 0;
    const isActive = asset.status.toLowerCase() === 'active';
    const TypeIcon = TYPE_ICONS[asset.type] || LayoutGrid;

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: val > 1000000 ? 'compact' : 'standard'
        }).format(val);
    };

    const formatNumber = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            notation: val > 1000 ? 'compact' : 'standard'
        }).format(val);
    };

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-primary/30">
            <div className="pt-[80px] pb-20 container mx-auto px-4 max-w-7xl">
                {/* Header Section */}
                <div className="mb-12">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group mb-8"
                    >
                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Back to Market</span>
                    </Link>

                    <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
                        <div className="flex items-center gap-8">
                            {/* Asset Image */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-br from-primary/30 to-purple-600/30 rounded-[2rem] blur-2xl opacity-50 group-hover:opacity-100 transition-all duration-700" />
                                <div className="relative w-28 h-28 lg:w-32 lg:h-32 rounded-[1.75rem] overflow-hidden border border-white/10 group-hover:border-primary/50 transition-all duration-500 shadow-2xl bg-zinc-900">
                                    <div className="absolute inset-0 flex items-center justify-center text-zinc-800 group-hover:text-primary/20 transition-colors">
                                        <TypeIcon className="w-12 h-12" />
                                    </div>
                                    {asset.imageUrl && !imageError && (
                                        <Image
                                            src={asset.imageUrl}
                                            alt={asset.name}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                            onError={() => setImageError(true)}
                                            unoptimized={asset.imageUrl.startsWith('/uploads')}
                                        />
                                    )}
                                </div>
                                <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl border flex items-center justify-center shadow-xl backdrop-blur-md ${isActive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                    }`}>
                                    {isActive ? <Activity className="w-5 h-5" /> : <Clock className="w-5 h-5 text-zinc-500" />}
                                </div>
                            </div>

                            {/* Name & Title */}
                            <div>
                                <div className="flex items-center gap-4 mb-3">
                                    <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-white">
                                        {asset.name}
                                    </h1>
                                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${isActive
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                        }`}>
                                        {asset.status}
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-6 text-sm font-medium text-zinc-500">
                                    <span className="flex items-center gap-2 text-primary">
                                        <TypeIcon className="w-5 h-5" />
                                        <span className="uppercase tracking-[0.1em] text-xs font-bold">{asset.type}</span>
                                    </span>
                                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-mono text-[10px] text-zinc-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 animate-pulse" />
                                        ID: {asset.id}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats Block */}
                        <div className="flex flex-col items-end gap-1">
                            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1">Live Price</div>
                            <div className="text-5xl font-black text-white font-mono tracking-tighter">
                                ${asset.price.toFixed(2)}
                            </div>
                            <div className={`flex items-center gap-1.5 text-sm font-black px-2.5 py-1 rounded-full ${isPositive ? 'text-emerald-400 bg-emerald-400/10' : 'text-rose-400 bg-rose-400/10'
                                }`}>
                                {isPositive ? <TrendingUp className="w-4 h-4" /> : <Activity className="w-4 h-4 rotate-180" />}
                                {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-[1fr,350px] gap-10 items-start">
                    <div className="space-y-10">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <StatCard label="Market Cap" value={formatCurrency(asset.marketCap)} />
                            <StatCard label="24h Volume" value={formatCurrency(asset.volume24h)} />
                            <StatCard label="Liquidity" value={formatCurrency(asset.liquidity)} icon={Bitcoin} />
                            <StatCard label="Holders" value={formatNumber(asset.holders || 0)} icon={Users} />
                            <StatCard label="Supply" value={formatNumber(asset.totalSupply)} icon={LayoutGrid} />
                            <StatCard label="Confidence" value="High" icon={Trophy} color="text-indigo-400" />
                        </div>

                        {/* Chart Card */}
                        <div className="bg-obsidian-900/50 rounded-3xl border border-white/5 p-1 overflow-hidden">
                            <AssetChart
                                data={chartData}
                                colors={{
                                    lineColor: isPositive ? '#10b981' : '#f43f5e',
                                    areaTopColor: isPositive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.2)',
                                    areaBottomColor: 'rgba(0, 0, 0, 0)',
                                    textColor: '#52525b',
                                }}
                                priceLines={{
                                    entry: asset.userPosition && asset.userPosition.shares !== 0 ? asset.userPosition.avgPrice : undefined,
                                    stopLoss: orderStopLoss ? parseFloat(orderStopLoss) : null,
                                    takeProfit: orderTakeProfit ? parseFloat(orderTakeProfit) : null,
                                }}
                                previewLines={previewLines}
                                onUpdatePreview={(type, price) => setPreviewLines(prev => ({ ...prev, [type]: price }))}
                                onUpdatePosition={handleChartUpdate}
                                activePositionId={activePositionId}
                                onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                            />
                        </div>

                        <AITerminal logs={oracleLogs} />
                    </div>

                    <TradingSidebar
                        assetId={asset.id}
                        assetName={asset.name}
                        assetPrice={asset.price}
                        marketPrice={asset.marketPrice}
                        status={asset.status}
                        onTradeSuccess={refreshData}
                        activePositionId={activePositionId}
                        onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                        previewLines={previewLines}
                        onPreviewChange={(type, val) => setPreviewLines(prev => ({ ...prev, [type]: val }))}
                    />
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color = "text-primary" }: { label: string; value: string; icon?: any; color?: string }) {
    return (
        <div className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 transition-colors group">
            <div className="flex items-center gap-3 mb-2">
                {Icon && (
                    <div className={`p-1.5 rounded-lg bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
                        <Icon className="w-3.5 h-3.5" />
                    </div>
                )}
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
            </div>
            <div className="text-lg font-black text-white font-mono">{value}</div>
        </div>
    );
}

