'use client';

import { useEffect, useState } from 'react';
import { CompactPositionItem } from './CompactPositionItem';
import { Layers, Loader2 } from 'lucide-react';

interface Position {
    assetId: string;
    assetName: string;
    shares: number;
    avgPrice: number;
    currentPrice: number;
    value: number;
    returnPercent: number;
    returnAbs: number;
    stopLoss?: number | null;
    takeProfit?: number | null;
}

interface PositionsListProps {
    currentAssetId?: string;
    activePositionId?: string | null;
    onSelectPosition?: (assetId: string | null) => void;
    onActionSuccess?: () => void;
}

export function PositionsList({
    currentAssetId,
    activePositionId,
    onSelectPosition,
    onActionSuccess
}: PositionsListProps) {
    const [positions, setPositions] = useState<Position[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPositions = async () => {
        try {
            const res = await fetch('/api/portfolio');
            if (res.ok) {
                const data = await res.json();
                setPositions(data.positions || []);
            }
        } catch (err) {
            console.error('Failed to fetch positions', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPositions();
        const interval = setInterval(fetchPositions, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Synchronizing_Vault...</span>
            </div>
        );
    }

    if (positions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-600 p-8 text-center glass-panel rounded-2xl">
                <Layers className="w-8 h-8 opacity-20 mb-4" />
                <h4 className="text-sm font-bold text-zinc-400 mb-1 uppercase tracking-tight">No Active Assets</h4>
                <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
                    You don't have any open positions yet. Start trading to track your portfolio.
                </p>
            </div>
        );
    }

    // Sort to keep current asset at top, then by value
    const sortedPositions = [...positions].sort((a, b) => {
        if (a.assetId === currentAssetId) return -1;
        if (b.assetId === currentAssetId) return 1;
        return b.value - a.value;
    });

    return (
        <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar pb-10">
            {sortedPositions.map((pos) => (
                <CompactPositionItem
                    key={pos.assetId}
                    position={pos}
                    isCurrentAsset={pos.assetId === currentAssetId}
                    isSelected={pos.assetId === activePositionId}
                    onSelect={() => onSelectPosition?.(pos.assetId)}
                    onActionSuccess={() => {
                        fetchPositions();
                        onActionSuccess?.();
                    }}
                />
            ))}
        </div>
    );
}
