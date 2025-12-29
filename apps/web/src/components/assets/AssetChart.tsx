'use client';

import { createChart, ColorType, IChartApi, LineStyle, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Clock, MousePointer2, TrendingUp, Minus, Square, Trash2, Crosshair } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type Timeframe = '1m' | '5m' | '15m' | '1H' | '4H' | '1D' | '1W';

interface Drawing {
    id: string;
    type: 'trendline' | 'ray' | 'rectangle';
    points: { time: number; price: number }[];
    color?: string;
}

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
    const seriesRef = useRef<ISeriesApi<any> | null>(null);
    const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>('15m');
    const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');
    const [isTimeframeMenuOpen, setIsTimeframeMenuOpen] = useState(false);

    // Drawing State
    const [activeTool, setActiveTool] = useState<'cursor' | 'trendline' | 'ray' | 'rectangle'>('cursor');
    const [drawings, setDrawings] = useState<Drawing[]>([]);
    const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
    const [hoveredDrawing, setHoveredDrawing] = useState<string | null>(null);

    // Coordinate state for SVG overlay
    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

    // Persist drawings
    useEffect(() => {
        const saved = localStorage.getItem('megatron_chart_drawings');
        if (saved) setDrawings(JSON.parse(saved));
    }, []);

    useEffect(() => {
        if (drawings.length > 0) {
            localStorage.setItem('megatron_chart_drawings', JSON.stringify(drawings));
        }
    }, [drawings]);

    const handleTimeframeSelect = (tf: Timeframe) => {
        setCurrentTimeframe(tf);
        setIsTimeframeMenuOpen(false);
        onTimeframeChange?.(tf);
    };

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (!chartContainerRef.current) return;
            const { clientWidth, clientHeight } = chartContainerRef.current;
            chartRef.current?.applyOptions({ width: clientWidth, height: clientHeight });
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
                horzLine: { visible: activeTool === 'cursor', labelVisible: activeTool === 'cursor' },
                vertLine: { visible: activeTool === 'cursor', labelVisible: activeTool === 'cursor' },
            },
        });

        chartRef.current = chart;
        setChartSize({ width: chartContainerRef.current.clientWidth, height: chart.options().height });

        let series: ISeriesApi<any>;

        if (chartType === 'area') {
            series = chart.addAreaSeries({
                lineColor: colors?.lineColor || '#3B82F6',
                topColor: colors?.areaTopColor || 'rgba(59, 130, 246, 0.5)',
                bottomColor: colors?.areaBottomColor || 'rgba(59, 130, 246, 0.0)',
                lineWidth: 2,
            });
        } else {
            series = chart.addCandlestickSeries({
                upColor: '#34d399',
                downColor: '#f43f5e',
                borderVisible: false,
                wickUpColor: '#34d399',
                wickDownColor: '#f43f5e',
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
    }, [data, colors, chartType, activeTool]);

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
    }, [priceLines, chartType]);

    // --- Drawing Engine Logic ---
    const getCoordinates = (e: React.MouseEvent) => {
        const chart = chartRef.current;
        const series = seriesRef.current;
        if (!chart || !series) return null;

        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (!rect) return null;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const time = chart.timeScale().coordinateToTime(x);
        const price = series.coordinateToPrice(y);

        if (time === null || price === null) return null;
        return { time: time as number, price: price as number, x, y };
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeTool === 'cursor') return;

        const coords = getCoordinates(e);
        if (!coords) return;

        const newDrawing: Drawing = {
            id: Math.random().toString(36).substr(2, 9),
            type: activeTool,
            points: [
                { time: coords.time, price: coords.price },
                { time: coords.time, price: coords.price }
            ]
        };
        setCurrentDrawing(newDrawing);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!currentDrawing) return;

        const coords = getCoordinates(e);
        if (!coords) return;

        setCurrentDrawing({
            ...currentDrawing,
            points: [currentDrawing.points[0], { time: coords.time, price: coords.price }]
        });
    };

    const handleMouseUp = () => {
        if (currentDrawing) {
            setDrawings([...drawings, currentDrawing]);
            setCurrentDrawing(null);
            setActiveTool('cursor');
        }
    };

    const renderDrawings = () => {
        const chart = chartRef.current;
        const series = seriesRef.current;
        if (!chart || !series) return null;

        const allDrawings = currentDrawing ? [...drawings, currentDrawing] : drawings;

        return allDrawings.map((drawing) => {
            const p1 = drawing.points[0];
            const p2 = drawing.points[1];

            const x1 = chart.timeScale().timeToCoordinate(p1.time as any);
            const y1 = series.priceToCoordinate(p1.price);
            const x2 = chart.timeScale().timeToCoordinate(p2.time as any);
            const y2 = series.priceToCoordinate(p2.price);

            if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

            if (drawing.type === 'trendline') {
                return (
                    <line
                        key={drawing.id}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#3B82F6"
                        strokeWidth="2"
                        className="transition-all hover:stroke-white cursor-pointer"
                        onMouseEnter={() => setHoveredDrawing(drawing.id)}
                    />
                );
            }

            if (drawing.type === 'ray') {
                return (
                    <line
                        key={drawing.id}
                        x1={x1} y1={y1} x2={chartSize.width} y2={y1}
                        stroke="#10B981"
                        strokeWidth="1"
                        strokeDasharray="4"
                    />
                );
            }

            if (drawing.type === 'rectangle') {
                return (
                    <rect
                        key={drawing.id}
                        x={Math.min(x1, x2)}
                        y={Math.min(y1, y2)}
                        width={Math.abs(x2 - x1)}
                        height={Math.abs(y2 - y1)}
                        fill="rgba(59, 130, 246, 0.1)"
                        stroke="#3B82F6"
                        strokeWidth="1"
                    />
                );
            }

            return null;
        });
    };

    return (
        <div className="relative w-full h-full flex overflow-hidden">
            {/* Professional Toolbar (Left) */}
            <div className="w-12 border-right border-white/5 bg-black/40 backdrop-blur-md flex flex-col items-center py-4 gap-4 z-40">
                <div className="flex flex-col gap-2">
                    <ToolbarButton
                        active={activeTool === 'cursor'}
                        onClick={() => setActiveTool('cursor')}
                        icon={<MousePointer2 className="w-4 h-4" />}
                        label="Cursor"
                    />
                    <div className="h-px bg-white/5 mx-2 my-1" />
                    <ToolbarButton
                        active={activeTool === 'trendline'}
                        onClick={() => setActiveTool('trendline')}
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Trend Line"
                    />
                    <ToolbarButton
                        active={activeTool === 'ray'}
                        onClick={() => setActiveTool('ray')}
                        icon={<Minus className="w-4 h-4" />}
                        label="Horizontal Ray"
                    />
                    <ToolbarButton
                        active={activeTool === 'rectangle'}
                        onClick={() => setActiveTool('rectangle')}
                        icon={<Square className="w-4 h-4" />}
                        label="Rectangle"
                    />
                    <div className="h-px bg-white/5 mx-2 my-1" />
                    <ToolbarButton
                        active={false}
                        onClick={() => { setDrawings([]); localStorage.removeItem('megatron_chart_drawings'); }}
                        icon={<Trash2 className="w-4 h-4" />}
                        label="Clear All"
                    />
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 relative group bg-black/20">
                {/* Timeframe & Chart Style Layer */}
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                    <button
                        onMouseEnter={() => setIsTimeframeMenuOpen(true)}
                        onMouseLeave={() => setIsTimeframeMenuOpen(false)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg text-[10px] font-bold text-gray-300 transition-all uppercase tracking-tighter"
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
                                className="absolute top-full left-0 mt-2 w-32 bg-[#0F1218] border border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden backdrop-blur-xl z-50"
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

                    <div className="flex bg-black/60 backdrop-blur-xl border border-white/10 rounded-lg p-0.5">
                        <ChartStyleButton active={chartType === 'area'} onClick={() => setChartType('area')}>Area</ChartStyleButton>
                        <ChartStyleButton active={chartType === 'candlestick'} onClick={() => setChartType('candlestick')}>Candles</ChartStyleButton>
                    </div>
                </div>

                {/* SVG Overlay for Drawings */}
                <svg
                    className={`absolute inset-0 z-30 pointer-events-auto ${activeTool !== 'cursor' ? 'cursor-crosshair' : ''}`}
                    width={chartSize.width}
                    height={chartSize.height}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{ pointerEvents: activeTool === 'cursor' ? 'none' : 'auto' }}
                >
                    {renderDrawings()}
                </svg>

                <div ref={chartContainerRef} className="w-full h-full" />
            </div>
        </div>
    );
}

function ToolbarButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${active ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/10 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
        >
            {icon}
        </button>
    );
}

function ChartStyleButton({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded transition-all ${active ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-600 hover:text-zinc-400'}`}
        >
            {children}
        </button>
    );
}


