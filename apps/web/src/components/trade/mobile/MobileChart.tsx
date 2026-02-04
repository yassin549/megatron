'use client';

import { useMemo, useState } from 'react';
import { AssetChart } from '@/components/assets/AssetChart';
import { ErrorBoundary } from '@/components/layout/ErrorBoundary';

interface MobileChartProps {
    data: { time: string; value: number; volume?: number }[];
    marginalPrice: number;
    marketPrice: number;
    change24h: number;
    watermarkText: string;
    priceLines?: {
        entry?: number;
        stopLoss?: number | null;
        takeProfit?: number | null;
    };
    userTrades?: Array<{
        time: number;
        price: number;
        quantity: number;
        side: 'buy' | 'sell';
    }>;
}

export function MobileChart({
    data,
    marginalPrice,
    marketPrice,
    change24h,
    watermarkText,
    priceLines,
    userTrades = [],
}: MobileChartProps) {
    const colors = useMemo(
        () => ({
            lineColor: change24h >= 0 ? '#10b981' : '#f43f5e',
            areaTopColor: change24h >= 0 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
            areaBottomColor: change24h >= 0 ? 'rgba(16, 185, 129, 0)' : 'rgba(244, 63, 94, 0)',
            textColor: '#52525b',
        }),
        [change24h]
    );

    if (data.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-3" />
                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                    Loading...
                </span>
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <ErrorBoundary name="Mobile Chart">
                <AssetChart
                    data={data}
                    marginalPrice={marginalPrice}
                    marketPrice={marketPrice}
                    watermarkText={watermarkText}
                    colors={colors}
                    priceLines={priceLines}
                    userTrades={userTrades}
                />
            </ErrorBoundary>
        </div>
    );
}
