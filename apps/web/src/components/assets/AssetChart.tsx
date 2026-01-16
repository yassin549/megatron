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
    marginalPrice: number;
    marketPrice: number;
    predictedPrice?: number;
    priceLines?: {
        entry?: number;
        stopLoss?: number | null;
        takeProfit?: number | null;
    };
    onUpdatePosition?: (updates: Partial<Record<'stopLoss' | 'takeProfit', number | null>>) => void;
    side?: 'buy' | 'sell';
    activePositionId?: string | null;
    onSelectPosition?: (assetId: string | null) => void;
    watermarkText?: string;
    userTrades?: Array<{
        time: number;
        price: number;
        quantity: number;
        side: 'buy' | 'sell';
    }>;
}

export function AssetChart({
    data,
    colors,
    marginalPrice,
    marketPrice,
    predictedPrice,
    priceLines,
    onUpdatePosition,
    side = 'buy',
    activePositionId,
    onSelectPosition,
    watermarkText,
    userTrades = []
}: ChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
    const [activeTimeframe, setActiveTimeframe] = useState<'1m' | '15m' | '1h' | '1d' | '1w' | 'all'>('all');

    const timeframes = [
        { label: '1m', value: 60 },
        { label: '15m', value: 15 * 60 },
        { label: '1h', value: 60 * 60 },
        { label: '1d', value: 24 * 60 * 60 },
        { label: '1w', value: 7 * 24 * 60 * 60 },
        { label: 'All', value: 0 },
    ];
    const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

    const [chartSize, setChartSize] = useState({ width: 0, height: 0 });

    const [localLines, setLocalLines] = useState({
        stopLoss: priceLines?.stopLoss ?? null,
        takeProfit: priceLines?.takeProfit ?? null,
    });

    const [pendingUpdates, setPendingUpdates] = useState<Record<'stopLoss' | 'takeProfit', number | null>>({
        stopLoss: null,
        takeProfit: null
    });

    const hasPending = pendingUpdates.stopLoss !== null || pendingUpdates.takeProfit !== null;

    useEffect(() => {
        if (!hasPending) {
            setLocalLines({
                stopLoss: priceLines?.stopLoss ?? null,
                takeProfit: priceLines?.takeProfit ?? null,
            });
        }
    }, [priceLines, hasPending]);

    const [draggingType, setDraggingType] = useState<'stopLoss' | 'takeProfit' | null>(null);
    const draggingTypeRef = useRef<'stopLoss' | 'takeProfit' | null>(null);

    const [hoverLine, setHoverLine] = useState<'stopLoss' | 'takeProfit' | 'entry' | null>(null);
    const [hoverAxis, setHoverAxis] = useState<'price' | 'time' | null>(null);

    const [profileBars, setProfileBars] = useState<{ top: number; height: number; width: number }[]>([]);

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

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: colors?.backgroundColor || 'transparent' },
                textColor: colors?.textColor || '#9CA3AF',
            },
            watermark: {
                visible: !!watermarkText,
                fontSize: 48,
                horzAlign: 'center',
                vertAlign: 'center',
                color: 'rgba(255, 255, 255, 0.05)',
                text: watermarkText || '',
                fontFamily: 'Inter, sans-serif',
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight || 400,
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.02)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.02)' },
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
    }, [colors, watermarkText]);

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

    useEffect(() => {
        if (!chartRef.current || !data.length || activeTimeframe === 'all') {
            chartRef.current?.timeScale().fitContent();
            return;
        }

        const timeframeObj = timeframes.find(tf => tf.label.toLowerCase() === activeTimeframe.toLowerCase());
        if (!timeframeObj || timeframeObj.value === 0) {
            chartRef.current.timeScale().fitContent();
            return;
        }

        const lastPoint = data[data.length - 1];
        // data.time might be string, need to convert to Unix timestamp if so
        const lastTime = typeof lastPoint.time === 'string' ? Math.floor(new Date(lastPoint.time).getTime() / 1000) : (lastPoint.time as any as number);
        const startTime = lastTime - timeframeObj.value;

        chartRef.current.timeScale().setVisibleRange({
            from: startTime as Time,
            to: lastTime as Time,
        });
    }, [activeTimeframe, data]);

    useEffect(() => {
        const series = seriesRef.current;
        if (!series) return;

        const lines: IPriceLine[] = [];
        const isSelected = activePositionId !== null;

        if (priceLines?.entry) {
            lines.push(series.createPriceLine({
                price: priceLines.entry,
                color: isSelected ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                lineWidth: isSelected ? 2 : 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: false,
                title: side.toUpperCase()
            }));
        }
        if (localLines.stopLoss) {
            lines.push(series.createPriceLine({
                price: localLines.stopLoss,
                color: '#f43f5e',
                lineWidth: isSelected ? 2 : 1,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: false,
                title: 'SL'
            }));
        }
        if (localLines.takeProfit) {
            lines.push(series.createPriceLine({
                price: localLines.takeProfit,
                color: '#34d399',
                lineWidth: isSelected ? 2 : 1,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: false,
                title: 'TP'
            }));
        }

        const isIndexTooClose = Math.abs(marginalPrice - marketPrice) < 0.0001;
        lines.push(series.createPriceLine({
            price: marketPrice,
            color: 'rgba(161, 161, 170, 0.4)',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: !isIndexTooClose,
            title: isIndexTooClose ? '' : 'INDEX'
        }));

        const execPrice = predictedPrice || marginalPrice;
        lines.push(series.createPriceLine({
            price: execPrice,
            color: '#22d3ee',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'EXEC EST'
        }));

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

                min = Math.min(min, execPrice, marketPrice);
                max = Math.max(max, execPrice, marketPrice);

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
            series.applyOptions({ autoscaleInfoProvider: undefined });
        };
    }, [priceLines?.entry, localLines, activePositionId, marginalPrice, predictedPrice, marketPrice, userTrades]);

    useEffect(() => {
        if (!seriesRef.current || !userTrades.length) {
            seriesRef.current?.setMarkers([]);
            return;
        }

        const markers: SeriesMarker<Time>[] = userTrades.map(trade => ({
            time: trade.time as Time,
            position: trade.side === 'buy' ? 'belowBar' : 'aboveBar',
            color: trade.side === 'buy' ? '#34d399' : '#f43f5e',
            shape: trade.side === 'buy' ? 'arrowUp' : 'arrowDown',
            text: trade.side.toUpperCase(),
            size: 1,
        }));

        seriesRef.current.setMarkers(markers.sort((a, b) => (a.time as number) - (b.time as number)));
    }, [userTrades]);

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!draggingTypeRef.current || !seriesRef.current || !chartContainerRef.current) return;
            const rect = chartContainerRef.current.getBoundingClientRect();
            const y = e.clientY - rect.top;
            if (y < 0 || y > rect.height) return;
            const newPrice = seriesRef.current.coordinateToPrice(y);
            if (newPrice !== null) {
                const priceValue = Number(newPrice.toFixed(4));
                setLocalLines(prev => ({
                    ...prev,
                    [draggingTypeRef.current!]: priceValue
                }));
            }
        };

        const handleGlobalMouseUp = () => {
            if (draggingTypeRef.current && seriesRef.current && chartContainerRef.current) {
                const type = draggingTypeRef.current;
                const priceVal = localLines[type];
                if (priceVal !== null) {
                    setPendingUpdates(prev => ({ ...prev, [type]: priceVal }));
                }

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
    }, [draggingType, localLines, activePositionId, onSelectPosition]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (hasPending) return;
        const series = seriesRef.current;
        if (!series) return;
        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const threshold = 20;

        if (x > rect.width - 60 || y > rect.height - 30) {
            return;
        }

        if (localLines.takeProfit) {
            const tpY = series.priceToCoordinate(localLines.takeProfit);
            if (tpY !== null && Math.abs(tpY - y) < threshold) {
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
                if (activePositionId === null) {
                    onSelectPosition?.('current');
                } else {
                    onSelectPosition?.(null);
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

        if (y > rect.height - 30 && x < rect.width - 60) {
            setHoverAxis('time');
            setHoverLine(null);
            return;
        }

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

    const toggleTarget = (targetType: 'stopLoss' | 'takeProfit') => {
        const currentMktPrice = data[data.length - 1]?.value || 0;

        const isSaved = targetType === 'stopLoss' ? !!priceLines?.stopLoss : !!priceLines?.takeProfit;
        const isCurrentlyPending = pendingUpdates[targetType] !== null;

        if (isSaved && !isCurrentlyPending) {
            onUpdatePosition?.({ [targetType]: null });
            return;
        }

        let defaultVal = currentMktPrice;
        if (targetType === 'stopLoss') {
            defaultVal = side === 'buy' ? currentMktPrice * 0.95 : currentMktPrice * 1.05;
        } else {
            defaultVal = side === 'buy' ? currentMktPrice * 1.05 : currentMktPrice * 0.95;
        }

        const priceValue = Number(defaultVal.toFixed(4));
        setLocalLines(prev => ({ ...prev, [targetType]: priceValue }));
        setPendingUpdates(prev => ({ ...prev, [targetType]: priceValue }));
        setDraggingType(targetType);
        draggingTypeRef.current = targetType;
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
            <AnimatePresence>
                {activePositionId && (
                    <motion.div
                        initial={{ y: -20, opacity: 0, x: '-50%' }}
                        animate={{ y: 0, opacity: 1, x: '-50%' }}
                        exit={{ y: -20, opacity: 0, x: '-50%' }}
                        className="absolute top-4 left-1/2 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl"
                    >
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

            <div className="flex items-center justify-end p-3 md:p-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-30">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                </span>
            </div>

            <div
                className="flex-1 relative"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ cursor: getCursorStyle() }}
            >
                <div className="absolute top-3 left-3 z-20 flex gap-1.5 p-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-lg shadow-2xl">
                    {timeframes.map((tf) => (
                        <button
                            key={tf.label}
                            onClick={() => setActiveTimeframe(tf.label.toLowerCase() as any)}
                            className={`px-2 py-1 text-[9px] font-black tracking-tighter uppercase rounded transition-all duration-200 ${activeTimeframe === tf.label.toLowerCase()
                                    ? 'bg-primary/20 text-primary shadow-[0_0_10px_rgba(59,130,246,0.2)]'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }`}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>

                <div ref={chartContainerRef} className="w-full h-full" />

                <div className="absolute left-0 top-0 bottom-0 w-48 pointer-events-none z-10 flex flex-col justify-start">
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
            </div>

            {draggingType && (
                <div className="absolute top-4 right-20 z-40 px-3 py-1 bg-blue-600 rounded text-[10px] font-black text-white uppercase tracking-widest animate-pulse shadow-xl border border-blue-400/30">
                    Adjusting {draggingType === 'stopLoss' ? 'Stop Loss' : 'Take Profit'}
                </div>
            )}
        </div>
    );
}
