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

    // SL/TP state
    const [orderStopLoss, setOrderStopLoss] = useState(initialAsset.userPosition?.stopLoss?.toString() || '');
    const [orderTakeProfit, setOrderTakeProfit] = useState(initialAsset.userPosition?.takeProfit?.toString() || '');
    const [isUpdatingTargets, setIsUpdatingTargets] = useState(false);
    const [activePositionId, setActivePositionId] = useState<string | null>(null);
    const [previewLines, setPreviewLines] = useState<{ stopLoss?: number | null; takeProfit?: number | null }>({});

    async function refreshData() {
        try {
            // Re-fetch logic if needed, or rely on SWR if we used it.
            // For now, we can just reload the page or trigger a router refresh
            window.location.reload();
        } catch (e) {
            console.error(e);
        }
    }

    const handleChartUpdate = async (type: 'stopLoss' | 'takeProfit', price: number) => {
        // This is now handled by the preview flow, but we keep it for reference or legacy
        console.log('Chart update', type, price);
    };

    const chartData = priceHistory.map(p => ({
        time: p.timestamp,
        value: p.price
    })).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    return (
        <div className="min-h-screen bg-black text-white font-sans selection:bg-primary/30">
            {/* Navbar would go here if not in layout, but assuming global layout or we need to add it */}
            <div className="pt-[80px] pb-20 container mx-auto px-4 max-w-7xl">
                <div className="mb-8">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group mb-6"
                    >
                        <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-700 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-mono text-xs uppercase tracking-widest">Back to Market</span>
                    </Link>

                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700" />
                                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10 group-hover:border-primary/50 transition-all duration-500 shadow-2xl">
                                    <Image
                                        src={asset.imageUrl || `https://ui-avatars.com/api/?name=${asset.name}&background=random`}
                                        alt={asset.name}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black rounded-xl border border-white/10 flex items-center justify-center text-primary shadow-xl">
                                    {isActive ? <Activity className="w-4 h-4" /> : <Clock className="w-4 h-4 text-zinc-500" />}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-1">
                                        {asset.name}
                                    </h1>
                                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${isActive
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                        : 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500'
                                        }`}>
                                        {asset.status}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm font-medium text-zinc-400">
                                    <span className="flex items-center gap-1.5 text-primary">
                                        <TypeIcon className="w-4 h-4" />
                                        <span className="uppercase tracking-wider text-xs">{asset.type}</span>
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-zinc-800" />
                                    <span className="font-mono">{asset.id}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-[1fr,350px] gap-8 items-start">
                    <div className="space-y-6">
                        <AssetChart
                            data={chartData}
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
                            previewLines={previewLines}
                            onUpdatePreview={(type, price) => setPreviewLines(prev => ({ ...prev, [type]: price }))}
                            onUpdatePosition={handleChartUpdate}
                            activePositionId={activePositionId}
                            onSelectPosition={(id) => setActivePositionId(id === 'current' ? asset?.id || null : id)}
                        />

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

const isActive = true; // Placeholder, deduced from logic
const TypeIcon = Activity; // Placeholder
