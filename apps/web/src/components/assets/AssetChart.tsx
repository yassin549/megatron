'use client';

import { createChart, ColorType, IChartApi, LineStyle } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W';

interface ChartProps {
    data: { time: string; value: number }[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
    onTimeframeChange?: (tf: Timeframe) => void;
    priceLines?: {
        entry?: number;
        stopLoss?: number;
        takeProfit?: number;
    };
}

export function AssetChart({ data, colors, onTimeframeChange, priceLines }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<any>(null);
    const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>('15m');
    const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');
    const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false);

    const handleTimeframeSelect = (tf: Timeframe) => {
        setCurrentTimeframe(tf);
        setIsTimeframeMenuOpen(false);
        onTimeframeChange?.(tf);
    };

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            chartRef.current?.applyOptions({ width: chartContainerRef.current?.clientWidth });
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors?.backgroundColor || 'transparent' },
                textColor: colors?.textColor || '#9CA3AF',
            },
            width: chartContainerRef.current.clientWidth,
            height: 400,
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: false,
                rightOffset: 12,
            },
            localization: {
                timeFormatter: (timestamp: number) => {
                    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                }
            },
            watermark: {
                visible: true,
                fontSize: 64,
                horzAlign: 'center',
                vertAlign: 'center',
                color: 'rgba(255, 255, 255, 0.05)',
                text: 'MEGATRON',
            },
        });

        chartRef.current = chart;

        let series: any;

        if (chartType === 'area') {
            series = chart.addAreaSeries({
                lineColor: colors?.lineColor || '#3B82F6',
                topColor: colors?.areaTopColor || 'rgba(59, 130, 246, 0.5)',
                bottomColor: colors?.areaBottomColor || 'rgba(59, 130, 246, 0.0)',
                lineWidth: 2,
            });
        } else {
            series = chart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });
        }

        seriesRef.current = series;

        if (data.length > 0) {
            if (chartType === 'candlestick') {
                const candleData = data.map(d => ({
                    time: d.time,
                    open: d.value,
                    high: d.value,
                    low: d.value,
                    close: d.value
                }));
                series.setData(candleData);
            } else {
                series.setData(data);
            }

            chart.timeScale().fitContent();
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, colors, chartType]);

    // Handle Price Lines
    useEffect(() => {
        const series = seriesRef.current;
        if (!series || !priceLines) return;

        // Clear existing custom lines if any (lightweight-charts doesn't have internal tracked refs we can use easily without storing them)
        // We'll trust the chart recreation in the main useEffect handles most cleanup, 
        // but for dynamic updates within the same chart instance, we need to track them.
    }, [priceLines]);

    // Optimized Price Lines Application
    useEffect(() => {
        const series = seriesRef.current;
        if (!series) return;

        const lines: any[] = [];

        if (priceLines?.entry) {
            lines.push(series.createPriceLine({
                price: priceLines.entry,
                color: 'rgba(255, 255, 255, 0.8)',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'ENTRY',
            }));
        }

        if (priceLines?.stopLoss) {
            lines.push(series.createPriceLine({
                price: priceLines.stopLoss,
                color: '#f43f5e',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'SL',
            }));
        }

        if (priceLines?.takeProfit) {
            lines.push(series.createPriceLine({
                price: priceLines.takeProfit,
                color: '#10b981',
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'TP',
            }));
        }

        return () => {
            lines.forEach(line => series.removePriceLine(line));
        };
    }, [priceLines, chartType]); // Re-apply when lines or chart type change

    return (
        <div className="relative w-full h-full">
            {/* Timeframe Controls (Top Left) */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
                <div className="relative" onMouseEnter={() => setIsTimeframeMenuOpen(true)} onMouseLeave={() => setIsTimeframeMenuOpen(false)}>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg text-xs font-medium text-gray-300 transition-colors">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{currentTimeframe}</span>
                    </button>

                    {isTimeframeMenuOpen && (
                        <div className="absolute top-full left-0 mt-1 w-32 bg-[#0F1218] border border-white/10 rounded-lg shadow-xl py-1 overflow-hidden backdrop-blur-xl z-50">
                            {(['1m', '5m', '15m', '1H', '4H', '1D', '1W'] as Timeframe[]).map((tf) => (
                                <button
                                    key={tf}
                                    onClick={() => handleTimeframeSelect(tf)}
                                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${currentTimeframe === tf
                                        ? 'bg-blue-500/10 text-blue-400 font-medium'
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chart Type Toggle (Top Right) */}
            <div className="absolute top-4 right-4 z-20 flex gap-2">
                <button
                    onClick={() => setChartType('area')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${chartType === 'area'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'bg-black/40 text-gray-400 border-white/10 hover:text-white'
                        }`}
                >
                    Line
                </button>
                <button
                    onClick={() => setChartType('candlestick')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${chartType === 'candlestick'
                        ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        : 'bg-black/40 text-gray-400 border-white/10 hover:text-white'
                        }`}
                >
                    Candles
                </button>
            </div>

            <div ref={chartContainerRef} className="w-full h-full" />
        </div >
    );
}
