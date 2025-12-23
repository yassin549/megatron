'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, LineData } from 'lightweight-charts';

interface EquityPoint {
    time: number;
    value: number;
    profit: number;
    cash: number;
}

interface EquityCurveChartProps {
    data: EquityPoint[];
    loading: boolean;
}

export function EquityCurveChart({ data, loading }: EquityCurveChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const equitySeriesRef = useRef<ISeriesApi<"Area"> | null>(null);
    const profitSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#94a3b8',
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 300,
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderVisible: false,
            },
            crosshair: {
                vertLine: {
                    color: '#3b82f6',
                    width: 1,
                    style: 1,
                    labelBackgroundColor: '#3b82f6',
                },
                horzLine: {
                    color: '#3b82f6',
                    width: 1,
                    style: 1,
                    labelBackgroundColor: '#3b82f6',
                },
            },
        });

        const equitySeries = chart.addAreaSeries({
            lineColor: '#3b82f6',
            topColor: 'rgba(59, 130, 246, 0.3)',
            bottomColor: 'rgba(59, 130, 246, 0.0)',
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        const profitSeries = chart.addLineSeries({
            color: '#10b981',
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        chartRef.current = chart;
        equitySeriesRef.current = equitySeries;
        profitSeriesRef.current = profitSeries;

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    useEffect(() => {
        if (equitySeriesRef.current && profitSeriesRef.current) {
            // Always set data to ensure chart renders (even if all values are 0)
            const equityData = data.length > 0
                ? data.map((p) => ({ time: p.time as any, value: p.value }))
                : [];
            const profitData = data.length > 0
                ? data.map((p) => ({ time: p.time as any, value: p.profit }))
                : [];

            equitySeriesRef.current.setData(equityData);
            profitSeriesRef.current.setData(profitData);

            if (data.length > 0) {
                chartRef.current?.timeScale().fitContent();
            }
        }
    }, [data]);

    return (
        <div className="glass-card rounded-xl p-6 relative">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Performance Analysis</h2>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                            Total Equity (Cash + Positions)
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            Realized Profit
                        </span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-white/5">
                        1D
                    </button>
                    <button className="px-3 py-1 text-xs bg-primary/20 text-primary rounded-lg border border-primary/20">
                        1M
                    </button>
                    <button className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground rounded-lg transition-colors border border-white/5">
                        ALL
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div ref={chartContainerRef} className="w-full h-[300px]" />
            )}

            <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-5">
                <ActivityIcon className="w-32 h-32 text-primary" />
            </div>
        </div>
    );
}

function ActivityIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
        </svg>
    );
}
