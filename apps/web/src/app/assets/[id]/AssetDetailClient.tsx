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
        // ...
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
                        ) : (
            // ...
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
        )
    }
                </div >
            </div >
        </div >
    );
}
