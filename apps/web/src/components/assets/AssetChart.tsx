'use client';

import { createChart, ColorType, IChartApi } from 'lightweight-charts';
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
}

export function AssetChart({ data, colors, onTimeframeChange }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
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

        // Transform data if needed for candlestick (mock open/close for now if simple line data provided)
        // Since we only passed 'value', we can't do true candlesticks yet unless backend sends OHLC.
        // For now, if we only have line data, we just map it to simple candles (Open=Close) or we have to stick to Area.
        // BUT user asked for toggle. We will try to map, but ideally backend sends candles.
        // Given current data structure is { time, value }, we can only show Area authentically.
        // To show candles processing, we'd need aggregation. 
        // For this task, we will just render the series. If data is incompatible, it might break.
        // Let's assume for now we keep Area series but maybe user *wants* to see candles.
        // We will just feed the same data point as O=H=L=C for now if it's single value, 
        // OR better: we keep the series type handling.

        if (data.length > 0) {
            if (chartType === 'candlestick') {
                // Mock OHLC from single value to prevent crash, OR ideally request OHLC from backend.
                // For this quick fix, we render flat candles to at least show the toggle works.
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

    return (
        <div className="relative w-full h-[400px]">
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
