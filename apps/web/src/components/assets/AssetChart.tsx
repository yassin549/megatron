import { createChart, ColorType, IChartApi, LineStyle, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
        stopLoss?: number | null;
        takeProfit?: number | null;
    };
    onPriceLineChange?: (type: 'stopLoss' | 'takeProfit', price: number) => void;
}

export function AssetChart({ data, colors, onTimeframeChange, priceLines, onPriceLineChange }: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<any> | null>(null);
    const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>('15m');
    const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false);
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

    // Dragging state
    const [draggingType, setDraggingType] = useState<'stopLoss' | 'takeProfit' | null>(null);

    const handleTimeframeSelect = (tf: Timeframe) => {
        setCurrentTimeframe(tf);
        setIsTimeframeMenuOpen(false);
        onTimeframeChange?.(tf);
    };

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (!chartContainerRef.current || !chartRef.current) return;
            const { clientWidth, clientHeight } = chartContainerRef.current;
            chartRef.current.applyOptions({ width: clientWidth, height: clientHeight });
            setChartSize({ width: clientWidth, height: clientHeight });
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors?.backgroundColor || 'transparent' },
                textColor: colors?.textColor || '#9CA3AF',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight || 400,
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                visible: true,
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
            crosshair: {
                horzLine: { color: 'rgba(255, 255, 255, 0.2)', labelBackgroundColor: '#1F2937' },
                vertLine: { color: 'rgba(255, 255, 255, 0.2)', labelBackgroundColor: '#1F2937' },
            },
        });

        chartRef.current = chart;
        setChartSize({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight || 400 });

        const series = chart.addAreaSeries({
            lineColor: colors?.lineColor || '#34d399',
            topColor: colors?.areaTopColor || 'rgba(52, 211, 153, 0.2)',
            bottomColor: 'rgba(0, 0, 0, 0)',
            lineWidth: 2,
        });

        seriesRef.current = series;

        if (data.length > 0) {
            series.setData(data);
            chart.timeScale().fitContent();
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, colors]);

    // Price Line Manager
    useEffect(() => {
        const series = seriesRef.current;
        if (!series) return;

        const lines: any[] = [];

        if (priceLines?.entry) {
            lines.push(series.createPriceLine({
                price: priceLines.entry,
                color: 'rgba(255, 255, 255, 0.5)',
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
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'SL',
            }));
        }

        if (priceLines?.takeProfit) {
            lines.push(series.createPriceLine({
                price: priceLines.takeProfit,
                color: '#34d399',
                lineWidth: 1,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'TP',
            }));
        }

        return () => {
            lines.forEach(line => series.removePriceLine(line));
        };
    }, [priceLines]);

    // Dragging Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        const series = seriesRef.current;
        if (!series || !priceLines) return;

        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const y = e.clientY - rect.top;
        const threshold = 15;

        // Check TP
        if (priceLines.takeProfit) {
            const tpY = series.priceToCoordinate(priceLines.takeProfit);
            if (tpY !== null && Math.abs(tpY - y) < threshold) {
                setDraggingType('takeProfit');
                e.preventDefault();
                return;
            }
        }

        // Check SL
        if (priceLines.stopLoss) {
            const slY = series.priceToCoordinate(priceLines.stopLoss);
            if (slY !== null && Math.abs(slY - y) < threshold) {
                setDraggingType('stopLoss');
                e.preventDefault();
                return;
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingType || !seriesRef.current) return;

        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const y = e.clientY - rect.top;
        const newPrice = seriesRef.current.coordinateToPrice(y);

        if (newPrice !== null) {
            onPriceLineChange?.(draggingType, Number(newPrice.toFixed(4)));
        }
    };

    const handleMouseUp = () => {
        setDraggingType(null);
    };

    return (
        <div className="relative w-full h-full flex flex-col overflow-hidden group">
            {/* Header / Controls */}
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-40">
                <div className="flex items-center gap-4">
                    <button
                        onMouseEnter={() => setIsTimeframeMenuOpen(true)}
                        onMouseLeave={() => setIsTimeframeMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] font-bold text-gray-300 transition-all uppercase tracking-tighter"
                    >
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span>{currentTimeframe}</span>
                    </button>

                    <AnimatePresence>
                        {isTimeframeMenuOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                                onMouseEnter={() => setIsTimeframeMenuOpen(true)}
                                onMouseLeave={() => setIsTimeframeMenuOpen(false)}
                                className="absolute top-12 left-4 w-32 bg-[#0F1218] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden backdrop-blur-xl z-50"
                            >
                                {(['1m', '5m', '15m', '1H', '4H', '1D', '1W'] as Timeframe[]).map((tf) => (
                                    <button
                                        key={tf}
                                        onClick={() => handleTimeframeSelect(tf)}
                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-bold transition-all uppercase ${currentTimeframe === tf ? 'bg-blue-500/10 text-blue-400' : 'text-zinc-500 hover:bg-white/5 hover:text-white'}`}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="hidden md:flex items-center gap-4">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Execution
                    </span>
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 relative bg-black/20">
                <div
                    className="absolute inset-0 z-20 cursor-default"
                    onMouseDown={handleMouseDown}
                    style={{ cursor: draggingType ? 'ns-resize' : 'crosshair' }}
                />

                <svg
                    className={`absolute inset-0 z-30 pointer-events-none`}
                    width={chartSize.width}
                    height={chartSize.height}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                />

                <div ref={chartContainerRef} className="w-full h-full" />

                {draggingType && (
                    <div className="absolute top-4 right-20 z-40 px-3 py-1 bg-blue-600 rounded text-[9px] font-black text-white uppercase tracking-widest animate-pulse">
                        Adjusting {draggingType === 'stopLoss' ? 'SL' : 'TP'}
                    </div>
                )}
            </div>
        </div>
    );
}
