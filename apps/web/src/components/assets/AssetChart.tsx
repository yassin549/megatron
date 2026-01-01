import { createChart, ColorType, IChartApi, LineStyle, ISeriesApi } from 'lightweight-charts';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface ChartProps {
    data: { time: string; value: number; volume?: number }[];
    colors?: {
        backgroundColor?: string;
        lineColor?: string;
        textColor?: string;
        areaTopColor?: string;
        areaBottomColor?: string;
    };
    priceLines?: {
        entry?: number;
        stopLoss?: number | null;
        takeProfit?: number | null;
    };
    onUpdatePosition?: (type: 'stopLoss' | 'takeProfit', price: number) => void;
    activePositionId?: string | null;
    onSelectPosition?: (assetId: string | null) => void;
}

export function AssetChart({
    data,
    colors,
    priceLines,
    onUpdatePosition,
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
    const [pendingUpdate, setPendingUpdate] = useState<{ type: 'stopLoss' | 'takeProfit', value: number } | null>(null);

    // Sync local lines with props when not dragging/pending
    useEffect(() => {
        if (!pendingUpdate) {
            setLocalLines({
                stopLoss: priceLines?.stopLoss ?? null,
                takeProfit: priceLines?.takeProfit ?? null,
            });
        }
    }, [priceLines, pendingUpdate]);

    // Dragging state
    const [draggingType, setDraggingType] = useState<'stopLoss' | 'takeProfit' | null>(null);
    const draggingTypeRef = useRef<'stopLoss' | 'takeProfit' | null>(null);

    // Hover state for cursor
    const [hoverLine, setHoverLine] = useState<'stopLoss' | 'takeProfit' | null>(null);
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

        const lines: any[] = [];
        const isSelected = activePositionId !== null;

        if (priceLines?.entry) {
            lines.push(series.createPriceLine({
                price: priceLines.entry,
                color: isSelected ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                lineWidth: isSelected ? 2 : 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: 'ENTRY'
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
    }, [priceLines?.entry, localLines, activePositionId]);

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
                    setPendingUpdate({ type, value: price });
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
        if (pendingUpdate) return;
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

        if (priceLines?.entry) {
            const entryY = series.priceToCoordinate(priceLines.entry);
            if (entryY !== null && Math.abs(entryY - y) < threshold) {
                onSelectPosition?.(activePositionId ? null : 'current');
                e.preventDefault();
                return;
            }
        }
        if (localLines.takeProfit) {
            const tpY = series.priceToCoordinate(localLines.takeProfit);
            if (tpY !== null && Math.abs(tpY - y) < threshold) {
                setDraggingType('takeProfit');
                draggingTypeRef.current = 'takeProfit';
                e.preventDefault();
                return;
            }
        }
        if (localLines.stopLoss) {
            const slY = series.priceToCoordinate(localLines.stopLoss);
            if (slY !== null && Math.abs(slY - y) < threshold) {
                setDraggingType('stopLoss');
                draggingTypeRef.current = 'stopLoss';
                e.preventDefault();
                return;
            }
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingType || pendingUpdate) return;
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
        if (hoverLine) return 'ns-resize';
        if (hoverAxis === 'price') return 'ns-resize';
        if (hoverAxis === 'time') return 'ew-resize';
        return 'crosshair';
    };

    const handleConfirmUpdate = () => {
        if (pendingUpdate) {
            onUpdatePosition?.(pendingUpdate.type, pendingUpdate.value);
            setPendingUpdate(null);
        }
    };

    const handleCancelUpdate = () => {
        setPendingUpdate(null);
        // Effects will sync localLines back to priceLines
    };

    return (
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#09090b]">
            {/* Header */}
            <div className="flex items-center justify-end p-3 md:p-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-40">
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

                {/* Confirm/Cancel Overlay */}
                {pendingUpdate && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex gap-2 bg-black/80 backdrop-blur-md p-2 rounded-xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={handleConfirmUpdate}
                            className="bg-emerald-500 hover:bg-emerald-400 text-white p-2 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
                            title="Confirm Change"
                        >
                            <Check className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleCancelUpdate}
                            className="bg-zinc-700 hover:bg-zinc-600 text-white p-2 rounded-lg transition-colors"
                            title="Cancel"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
