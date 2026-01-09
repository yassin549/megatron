import { createChart, ColorType, IChartApi, LineStyle, ISeriesApi, IPriceLine, SeriesMarker, Time } from 'lightweight-charts';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Check, X, Shield, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChartProps {
    data: { time: string; value: number; volume?: number }[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
    price: number;
    marketPrice: number;
    priceLines?: {
        entry?: number;
        stopLoss?: number | null;
        takeProfit?: number | null;
    };
    onUpdatePosition?: (updates: Partial<Record<'stopLoss' | 'takeProfit', number | null>>) => void;
    side?: 'buy' | 'sell';
    activePositionId?: string | null;
    onSelectPosition?: (assetId: string | null) => void;
}

export function AssetChart({
    data,
    colors,
    price,
    marketPrice,
    priceLines,
    onUpdatePosition,
    side = 'buy',
    activePositionId,
    onSelectPosition
}: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<'Area'> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

    // Local lines state for optimistic UI updates during drag
    const [localLines, setLocalLines] = useState({
        stopLoss: priceLines?.stopLoss ?? null,
        takeProfit: priceLines?.takeProfit ?? null,
    });

    // Pending confirmation state
    const [pendingUpdates, setPendingUpdates] = useState<Record<'stopLoss' | 'takeProfit', number | null>>({
        stopLoss: null,
        takeProfit: null
    });

    const hasPending = pendingUpdates.stopLoss !== null || pendingUpdates.takeProfit !== null;

    // Sync local lines with props when not dragging/pending
    useEffect(() => {
        if (!hasPending) {
            setLocalLines({
                stopLoss: priceLines?.stopLoss ?? null,
                takeProfit: priceLines?.takeProfit ?? null,
            });
        }
    }, [priceLines, hasPending]);

    // Dragging state
    const [draggingType, setDraggingType] = useState<'stopLoss' | 'takeProfit' | null>(null);
    const draggingTypeRef = useRef<'stopLoss' | 'takeProfit' | null>(null);

    // Hover state for cursor
    const [hoverLine, setHoverLine] = useState<'stopLoss' | 'takeProfit' | 'entry' | null>(null);
    const [hoverAxis, setHoverAxis] = useState<'price' | 'time' | null>(null);

    // Profile state for coordinate-based rendering
    const [profileBars, setProfileBars] = useState<{ top: number; height: number; width: number }[]>([]);

    // 1. Calculate Volume Profile Bins
    const volumeProfileBins = useMemo(() => {
        if (!data.length) return [];
        const prices = data.map(d => d.value);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const range = max - min;
        if (range === 0) return [];

        const binCount = 20;
        const binSize = range / binCount;
        const bins = new Array(binCount).fill(0).map((_, i) => ({
            priceStart: min + i * binSize,
            priceEnd: min + (i + 1) * binSize,
            volume: 0
        }));

        data.forEach(d => {
            const index = Math.min(binCount - 1, Math.floor((d.value - min) / binSize));
            bins[index].volume += d.volume || 1;
        });

        const maxVol = Math.max(...bins.map(b => b.volume));
        return bins.map(b => ({ ...b, width: (b.volume / maxVol) * 100 }));
    }, [data]);

    // 2. Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors?.backgroundColor || 'transparent' },
                textColor: colors?.textColor || '#9CA3AF',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight || 400,
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
            },
            leftPriceScale: { visible: false },
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
            crosshair: {
                horzLine: { color: 'rgba(255, 255, 255, 0.2)', labelBackgroundColor: '#1F2937' },
                vertLine: { color: 'rgba(255, 255, 255, 0.2)', labelBackgroundColor: '#1F2937' },
            },
            handleScroll: {
                vertTouchDrag: true,
                horzTouchDrag: true,
                mouseWheel: true,
                pressedMouseMove: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        const series = chart.addAreaSeries({
            lineColor: colors?.lineColor || '#34d399',
            topColor: colors?.areaTopColor || 'rgba(52, 211, 153, 0.1)',
            bottomColor: 'rgba(0, 0, 0, 0)',
            lineWidth: 2,
        });

        const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });
        volumeSeries.priceScale().applyOptions({
            scaleMargins: { top: 0.85, bottom: 0 },
        });

        chartRef.current = chart;
        seriesRef.current = series;
        volumeSeriesRef.current = volumeSeries;
        setChartSize({ width: chartContainerRef.current.clientWidth, height: chart.options().height });

        const handleResize = () => {
            if (!chartContainerRef.current || !chartRef.current) return;
            const { clientWidth, clientHeight } = chartContainerRef.current;
            chartRef.current.applyOptions({ width: clientWidth, height: clientHeight });
            setChartSize({ width: clientWidth, height: clientHeight });
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [colors]);

    // 3. Update Data
    useEffect(() => {
        if (!seriesRef.current || !volumeSeriesRef.current || !data.length) return;

        seriesRef.current.setData(data.map(d => ({ time: d.time as any, value: d.value })));

        const volumeData = data.map((d, i) => ({
            time: d.time as any,
            value: d.volume || 0,
            color: (i > 0 && d.value >= data[i - 1].value) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'
        }));
        volumeSeriesRef.current.setData(volumeData);

        chartRef.current?.timeScale().fitContent();
    }, [data]);

    // 4. Map Profile Bins to Coordinates
    useEffect(() => {
        const series = seriesRef.current;
        if (!series || !volumeProfileBins.length) return;

        const timer = setTimeout(() => {
            const bars = volumeProfileBins.map(bin => {
                const yStart = series.priceToCoordinate(bin.priceEnd) || 0;
                const yEnd = series.priceToCoordinate(bin.priceStart) || 0;
                return {
                    top: yStart,
                    height: Math.max(1, yEnd - yStart),
                    width: bin.width
                };
            });
            setProfileBars(bars);
        }, 50);

        return () => clearTimeout(timer);
    }, [volumeProfileBins, chartSize, data]);

    // 5. Price Line Management (Use localLines)
    useEffect(() => {
        const series = seriesRef.current;
        if (!series) return;

        // 5. Create Price Lines
        const lines: IPriceLine[] = [];
        const isSelected = activePositionId !== null;

        // Entry Line
        if (priceLines?.entry) {
            lines.push(series.createPriceLine({
                price: priceLines.entry,
                color: isSelected ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                lineWidth: isSelected ? 2 : 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: side.toUpperCase()
            }));
        }
        if (localLines.stopLoss) {
            lines.push(series.createPriceLine({
                price: localLines.stopLoss,
                color: '#f43f5e',
                lineWidth: isSelected ? 2 : 1,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'SL'
            }));
        }
        if (localLines.takeProfit) {
            lines.push(series.createPriceLine({
                price: localLines.takeProfit,
                color: '#34d399',
                lineWidth: isSelected ? 2 : 1,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: 'TP'
            }));
        }

        // Market Price Line (Subtle)
        const isTooClose = Math.abs(price - marketPrice) < 0.0001;
        lines.push(series.createPriceLine({
            price: marketPrice,
            color: 'rgba(161, 161, 170, 0.8)', // Brighter Zinc
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: !isTooClose, // Hide if identical to prevent overlap
            title: isTooClose ? '' : ''
        }));

        // Execution Price Line (Solid and clear)
        lines.push(series.createPriceLine({
            price: price,
            color: '#22d3ee', // Solid Cyan
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: ''
        }));

        // Apply Autoscale to include lines
        series.applyOptions({
            autoscaleInfoProvider: (original: any) => {
                const res = original();
                if (!res || !res.priceRange) return res;

                let min = res.priceRange.minValue;
                let max = res.priceRange.maxValue;

                if (priceLines?.entry) {
                    min = Math.min(min, priceLines.entry);
                    max = Math.max(max, priceLines.entry);
                }
                if (localLines.stopLoss) {
                    min = Math.min(min, localLines.stopLoss);
                    max = Math.max(max, localLines.stopLoss);
                }
                if (localLines.takeProfit) {
                    min = Math.min(min, localLines.takeProfit);
                    max = Math.max(max, localLines.takeProfit);
                }

                // Always include current prices
                min = Math.min(min, price, marketPrice);
                max = Math.max(max, price, marketPrice);

                // Add some padding
                const range = max - min;
                return {
                    priceRange: {
                        minValue: min - range * 0.1,
                        maxValue: max + range * 0.1,
                    },
                };
            },
        });

        return () => {
            lines.forEach(line => series.removePriceLine(line));
            // Reset autoscale (optional, but good practice)
            series.applyOptions({ autoscaleInfoProvider: undefined });
        };
    }, [priceLines?.entry, localLines, activePositionId, price, marketPrice]);

    // 6. Global Dragging Logic
    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!draggingTypeRef.current || !seriesRef.current || !chartContainerRef.current) return;
            const rect = chartContainerRef.current.getBoundingClientRect();
            const y = e.clientY - rect.top;
            if (y < 0 || y > rect.height) return;
            const newPrice = seriesRef.current.coordinateToPrice(y);
            if (newPrice !== null) {
                const price = Number(newPrice.toFixed(4));
                setLocalLines(prev => ({
                    ...prev,
                    [draggingTypeRef.current!]: price
                }));
            }
        };

        const handleGlobalMouseUp = () => {
            if (draggingTypeRef.current && seriesRef.current && chartContainerRef.current) {
                // Determine final price
                const type = draggingTypeRef.current;
                const price = localLines[type];
                if (price !== null) {
                    setPendingUpdates(prev => ({ ...prev, [type]: price }));
                }

                // If not active, select it
                if (!activePositionId) {
                    onSelectPosition?.('current');
                }

                setDraggingType(null);
                draggingTypeRef.current = null;
            }
        };

        if (draggingType) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [draggingType, localLines]); // Need localLines in dep to capture latest value

    const handleMouseDown = (e: React.MouseEvent) => {
        if (hasPending) return;
        const series = seriesRef.current;
        if (!series) return;
        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const threshold = 20;

        // Detection for axis Interaction scaling
        // If we are in axis zones, let the chart handle it (don't preventDefault)
        if (x > rect.width - 60 || y > rect.height - 30) {
            return;
        }

        if (localLines.takeProfit) {
            const tpY = series.priceToCoordinate(localLines.takeProfit);
            if (tpY !== null && Math.abs(tpY - y) < threshold) {
                // Auto-select on drag start
                if (!activePositionId) onSelectPosition?.('current');
                setDraggingType('takeProfit');
                draggingTypeRef.current = 'takeProfit';
                e.preventDefault();
                return;
            }
        }
        if (localLines.stopLoss) {
            const slY = series.priceToCoordinate(localLines.stopLoss);
            if (slY !== null && Math.abs(slY - y) < threshold) {
                // Auto-select on drag start
                if (!activePositionId) onSelectPosition?.('current');
                setDraggingType('stopLoss');
                draggingTypeRef.current = 'stopLoss';
                e.preventDefault();
                return;
            }
        }
        if (priceLines?.entry) {
            const entryY = series.priceToCoordinate(priceLines.entry);
            if (entryY !== null && Math.abs(entryY - y) < threshold) {
                // If not active, select it first
                if (activePositionId === null) {
                    onSelectPosition?.('current');
                } else {
                    onSelectPosition?.(null); // Click twice to toggle off if already active? (Optional)
                }
                e.preventDefault();
                return;
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingType || hasPending) return;
        const series = seriesRef.current;
        if (!series) {
            setHoverLine(null);
            setHoverAxis(null);
            return;
        }
        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const threshold = 15;

        // Time axis check (bottom)
        if (y > rect.height - 30 && x < rect.width - 60) {
            setHoverAxis('time');
            setHoverLine(null);
            return;
        }

        // Price axis check (right)
        if (x > rect.width - 60 && y < rect.height - 30) {
            setHoverAxis('price');
            setHoverLine(null);
            return;
        }

        setHoverAxis(null);

        if (priceLines?.entry) {
            const entryY = series.priceToCoordinate(priceLines.entry);
            if (entryY !== null && Math.abs(entryY - y) < threshold) {
                setHoverLine('entry');
                return;
            }
        }
        if (localLines.takeProfit) {
            const tpY = series.priceToCoordinate(localLines.takeProfit);
            if (tpY !== null && Math.abs(tpY - y) < threshold) {
                setHoverLine('takeProfit');
                return;
            }
        }
        if (localLines.stopLoss) {
            const slY = series.priceToCoordinate(localLines.stopLoss);
            if (slY !== null && Math.abs(slY - y) < threshold) {
                setHoverLine('stopLoss');
                return;
            }
        }
        setHoverLine(null);
    };

    const handleMouseLeave = () => {
        setHoverLine(null);
        setHoverAxis(null);
    };

    const getCursorStyle = () => {
        if (draggingType) return 'ns-resize';
        if (hoverLine === 'entry') return 'pointer';
        if (hoverLine) return 'ns-resize';
        if (hoverAxis === 'price') return 'ns-resize';
        if (hoverAxis === 'time') return 'ew-resize';
        return 'crosshair';
    };

    const toggleTarget = (type: 'stopLoss' | 'takeProfit') => {
        const currentPrice = data[data.length - 1]?.value || 0;
        const entryPrice = priceLines?.entry || currentPrice;

        // If target exists in props (saved), and we aren't already pending a change for it, cancel it
        const isSaved = type === 'stopLoss' ? !!priceLines?.stopLoss : !!priceLines?.takeProfit;
        const isCurrentlyPending = pendingUpdates[type] !== null;

        if (isSaved && !isCurrentlyPending) {
            onUpdatePosition?.({ [type]: null });
            return;
        }

        // Otherwise, initialize a default target and enter pending state
        let defaultVal = currentPrice;
        if (type === 'stopLoss') {
            defaultVal = side === 'buy' ? currentPrice * 0.95 : currentPrice * 1.05;
        } else {
            defaultVal = side === 'buy' ? currentPrice * 1.05 : currentPrice * 0.95;
        }

        const price = Number(defaultVal.toFixed(4));
        setLocalLines(prev => ({ ...prev, [type]: price }));
        setPendingUpdates(prev => ({ ...prev, [type]: price }));
        setDraggingType(type);
        draggingTypeRef.current = type;
    };

    const handleConfirmUpdate = () => {
        const batch: Partial<Record<'stopLoss' | 'takeProfit', number | null>> = {};
        if (pendingUpdates.stopLoss !== null) batch.stopLoss = pendingUpdates.stopLoss;
        if (pendingUpdates.takeProfit !== null) batch.takeProfit = pendingUpdates.takeProfit;

        if (Object.keys(batch).length > 0) {
            onUpdatePosition?.(batch);
        }
        setPendingUpdates({ stopLoss: null, takeProfit: null });
    };

    const handleCancelUpdate = () => {
        setPendingUpdates({ stopLoss: null, takeProfit: null });
    };

    return (
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#09090b]">
            {/* Header / Control Pill Overlay - Only visible when a position is selected */}
            <AnimatePresence>
                {activePositionId && (
                    <motion.div
                        initial={{ y: -20, opacity: 0, x: '-50%' }}
                        animate={{ y: 0, opacity: 1, x: '-50%' }}
                        exit={{ y: -20, opacity: 0, x: '-50%' }}
                        className="absolute top-4 left-1/2 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl"
                    >
                        {/* SL Button */}
                        <button
                            onClick={() => toggleTarget('stopLoss')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${priceLines?.stopLoss
                                ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/40'
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Shield className="w-3.5 h-3.5" />
                            SL
                        </button>

                        {/* Confirm/Cancel (Integrated) */}
                        <AnimatePresence mode="wait">
                            {hasPending && (
                                <motion.div
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: 'auto', opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    className="flex items-center gap-1.5 overflow-hidden px-1"
                                >
                                    <div className="w-px h-4 bg-white/10 mx-1" />
                                    <button
                                        onClick={handleConfirmUpdate}
                                        className="p-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg transition-all"
                                    >
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={handleCancelUpdate}
                                        className="p-1.5 bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* TP Button */}
                        <button
                            onClick={() => toggleTarget('takeProfit')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${priceLines?.takeProfit
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/40'
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Target className="w-3.5 h-3.5" />
                            TP
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Original Live Header (Moved or hidden) */}
            <div className="flex items-center justify-end p-3 md:p-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-30">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                </span>
            </div>

            {/* Chart Area */}
            <div
                className="flex-1 relative"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: getCursorStyle() }}
            >
                {/* Interaction Layer - Labels and Lines */}
                <div className="absolute inset-0 pointer-events-none z-20" />

                <div ref={chartContainerRef} className="w-full h-full" />

                {/* Volume Profile Overlay */}
                <div className="absolute left-0 top-0 bottom-0 w-48 pointer-events-none z-10">
                    {profileBars.map((bar, i) => (
                        <div
                            key={i}
                            className="absolute left-0 bg-blue-500/10 border-r border-blue-500/10"
                            style={{
                                top: bar.top,
                                height: bar.height,
                                width: `${bar.width}%`,
                                opacity: bar.width / 100 + 0.1
                            }}
                        />
                    ))}
                </div>

                {/* Drag Indicator */}
                {draggingType && (
                    <div className="absolute top-4 right-20 z-40 px-3 py-1 bg-blue-600 rounded text-[10px] font-black text-white uppercase tracking-widest animate-pulse shadow-xl border border-blue-400/30">
                        Adjusting {draggingType === 'stopLoss' ? 'Stop Loss' : 'Take Profit'}
                    </div>
                )}

            </div>
        </div>
    );
}
