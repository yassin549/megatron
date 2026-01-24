import React, { useEffect, useRef, useState, useMemo } from 'react';
import { init, dispose, Chart, Nullable, Overlay, Styles, DeepPartial, KLineData } from 'klinecharts';
import { Check, X, Shield, Target, MousePointer2, TrendingUp, Minus, Layers, Trash2 } from 'lucide-react';
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
    const chartRef = useRef<Nullable<Chart>>(null);
    const [activeTimeframe, setActiveTimeframe] = useState<'1m' | '15m' | '1h' | '1d' | '1w' | 'all'>('all');
    const [activeTool, setActiveTool] = useState<string | null>(null);

    const timeframes = [
        { label: '1m', value: 60 },
        { label: '15m', value: 15 * 60 },
        { label: '1h', value: 60 * 60 },
        { label: '1d', value: 24 * 60 * 60 },
        { label: '1w', value: 7 * 24 * 60 * 60 },
        { label: 'All', value: 0 },
    ];

    const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);

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

    const kLineData = useMemo(() => {
        return data.map(d => ({
            timestamp: typeof d.time === 'string' ? new Date(d.time).getTime() : d.time * 1000,
            open: d.value,
            high: d.value,
            low: d.value,
            close: d.value,
            volume: d.volume || 0
        }));
    }, [data]);

    const subscribeBarRef = useRef<((data: KLineData) => void) | null>(null);
    const dataRef = useRef(data);

    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Initial chart setup and robust data loading
    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        // dispose previous instance if any to prevent leaks/duplicates
        try {
            dispose(container);
        } catch (e) {
            console.warn('[AssetChart] Dispose cleanup warning:', e);
        }

        const chart = init(container, {
            styles: {
                grid: {
                    show: true,
                    horizontal: { color: 'rgba(255, 255, 255, 0.02)' },
                    vertical: { color: 'rgba(255, 255, 255, 0.02)' }
                },
                candle: {
                    type: 'area' as any,
                    area: {
                        lineColor: colors?.lineColor || '#34d399',
                        lineSize: 2,
                        backgroundColor: [
                            { offset: 0, color: colors?.areaBottomColor || 'rgba(52, 211, 153, 0)' },
                            { offset: 1, color: colors?.areaTopColor || 'rgba(52, 211, 153, 0.5)' }
                        ],
                        point: {
                            show: true,
                            color: colors?.lineColor || '#34d399',
                            radius: 4,
                            rippleColor: colors?.areaTopColor || 'rgba(52, 211, 153, 0.2)',
                            rippleRadius: 8
                        }
                    }
                },
                xAxis: {
                    axisLine: { color: 'rgba(255, 255, 255, 0.1)' },
                    tickLine: { color: 'rgba(255, 255, 255, 0.1)' },
                    tickText: { color: colors?.textColor || '#9CA3AF' }
                },
                yAxis: {
                    axisLine: { color: 'rgba(255, 255, 255, 0.1)' },
                    tickLine: { color: 'rgba(255, 255, 255, 0.1)' },
                    tickText: { color: colors?.textColor || '#9CA3AF' }
                },
                separator: { color: 'rgba(255, 255, 255, 0.1)' },
                crosshair: {
                    horizontal: { line: { color: 'rgba(255, 255, 255, 0.2)' }, text: { backgroundColor: '#1F2937' } },
                    vertical: { line: { color: 'rgba(255, 255, 255, 0.2)' }, text: { backgroundColor: '#1F2937' } }
                }
            } as any
        });

        if (chart) {
            chartRef.current = chart;

            chart.setDataLoader({
                getBars: (params) => {
                    const rawData = dataRef.current.map(d => ({
                        timestamp: typeof d.time === 'string' ? new Date(d.time).getTime() : d.time * 1000,
                        open: d.value,
                        high: d.value,
                        low: d.value,
                        close: d.value,
                        volume: d.volume || 0
                    }));

                    // Simple filtering for timeframe if needed, or just return all and let library aggregate
                    // For KLineCharts, usually passing all data and letting it handle aggregation via `setPeriod` is fine.
                    // But to be safe and match previous logic (without strict aggregation which might be buggy):

                    // Passing { backward: false } tells the chart there is no more historical data to fetch.
                    params.callback(rawData, { backward: false, forward: false });
                },
                subscribeBar: (params) => {
                    subscribeBarRef.current = params.callback;
                },
                unsubscribeBar: () => {
                    subscribeBarRef.current = null;
                }
            });

            // Attach listeners to drawing tools to track selection
            ['segment', 'horizontalRay', 'fibonacciRetracement', 'straightLine', 'priceLine', 'arrow'].forEach(name => {
                chart.overrideOverlay({
                    name,
                    onSelected: (e: any) => {
                        setSelectedDrawing(e.overlay.id);
                    },
                    onDeselected: () => {
                        setSelectedDrawing(null);
                    }
                });
            });

            // Set initial symbol to trigger load
            chart.setSymbol({ ticker: watermarkText || 'ASSET' });
        }

        const handleResize = () => {
            chart?.resize();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            try {
                if (container) dispose(container);
            } catch (e) {
                console.warn('[AssetChart] Dispose cleanup warning:', e);
            }
            chartRef.current = null;
        };
    }, [colors, watermarkText]); // Re-init if visual config or symbol identity changes

    // Update styles reactively when colors change
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        chart.setStyles({
            candle: {
                area: {
                    lineColor: colors?.lineColor || '#34d399',
                    backgroundColor: [
                        { offset: 0, color: colors?.areaBottomColor || 'rgba(52, 211, 153, 0)' },
                        { offset: 1, color: colors?.areaTopColor || 'rgba(52, 211, 153, 0.5)' }
                    ],
                    point: {
                        color: colors?.lineColor || '#34d399',
                        rippleColor: colors?.areaTopColor || 'rgba(52, 211, 153, 0.2)'
                    }
                }
            },
            xAxis: {
                tickText: { color: colors?.textColor || '#9CA3AF' }
            },
            yAxis: {
                tickText: { color: colors?.textColor || '#9CA3AF' }
            }
        } as any);
    }, [colors]);

    // Reactive Data Updates
    useEffect(() => {
        if (!kLineData.length || !subscribeBarRef.current) return;

        const lastPoint = kLineData[kLineData.length - 1];
        // Feed the latest point to the chart via subscription
        subscribeBarRef.current(lastPoint);

        // Also force a reload if data length changed significantly to ensure history is correct?
        // Actually, setDataLoader should handle history. subscribeBar handles real-time.
        // If we have a full refresh, we might need to trigger getBars again?
        // chartRef.current?.applyNewData is definitely broken.
        // We rely on dataRef being updated and getting called by library, or manual refresh?

    }, [kLineData]);

    // Handle timeframe changes
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        // Smart Map: Timeframe -> { interval, range_duration_ms }
        const finalConfig: Record<string, { period: { span: number; type: string }, duration?: number }> = {
            '1m': { period: { span: 1, type: 'minute' }, duration: 1000 * 60 * 30 }, // 30 mins range
            '15m': { period: { span: 1, type: 'minute' }, duration: 1000 * 60 * 15 }, // 15 mins range
            '1h': { period: { span: 5, type: 'minute' }, duration: 1000 * 60 * 60 }, // 1 Hour Range
            '1d': { period: { span: 15, type: 'minute' }, duration: 1000 * 60 * 60 * 24 }, // 1 Day Range
            '1w': { period: { span: 1, type: 'hour' }, duration: 1000 * 60 * 60 * 24 * 7 }, // 1 Week Range
            'all': { period: { span: 1, type: 'day' }, duration: 0 }
        };

        const config = finalConfig[activeTimeframe] || finalConfig['all'];

        chart.setPeriod(config.period as any);

        // Auto-fit logic
        const fitContent = () => {
            const dataList = chart.getDataList();
            const dataLength = dataList.length;
            if (dataLength === 0) return;

            const containerWidth = chartContainerRef.current?.clientWidth || 0;
            if (containerWidth === 0) return;

            let optimalSpace = 0;

            if (config.duration && config.duration > 0) {
                // Calculate how many bars fit in the duration based on current period
                const barDurationMs = config.period.span * (
                    config.period.type === 'minute' ? 60000 :
                        config.period.type === 'hour' ? 3600000 :
                            config.period.type === 'day' ? 86400000 :
                                config.period.type === 'week' ? 604800000 : 0
                );

                if (barDurationMs > 0) {
                    const barsToShow = config.duration / barDurationMs;
                    optimalSpace = containerWidth / barsToShow;
                }
            } else {
                // Fit All
                optimalSpace = containerWidth / dataLength;
            }

            // Animate zoom
            const barSpace = chart.getBarSpace();
            const startSpace = barSpace.bar + barSpace.gapBar;
            const targetSpace = optimalSpace;
            const duration = 300; // ms
            const startTime = performance.now();

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const ease = 1 - Math.pow(1 - progress, 3);

                const currentSpace = startSpace + (targetSpace - startSpace) * ease;
                chart.setBarSpace(currentSpace);

                // Keep right edge locked
                chart.scrollToRealTime();

                if (progress < 1) {
                    requestAnimationFrame(animate);
                }
            };

            requestAnimationFrame(animate);
        };


        // Small timeout to allow data to process/render after period change
        setTimeout(fitContent, 50);

    }, [activeTimeframe]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        chart.removeOverlay({ name: 'entry-line' });
        chart.removeOverlay({ name: 'sl-line' });
        chart.removeOverlay({ name: 'tp-line' });
        chart.removeOverlay({ name: 'index-line' });
        chart.removeOverlay({ name: 'exec-line' });

        const isSelected = activePositionId !== null;

        if (priceLines?.entry) {
            chart.createOverlay({
                name: 'horizontalRay',
                id: 'entry-line',
                lock: true,
                points: [{ value: priceLines.entry }],
                styles: {
                    line: {
                        color: isSelected ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                        style: 'dashed' as any,
                        size: isSelected ? 2 : 1
                    },
                    text: {
                        color: '#fff',
                        backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.8)' : 'rgba(255, 255, 255, 0.3)'
                    }
                }
            } as any);
        }

        if (localLines.stopLoss) {
            chart.createOverlay({
                name: 'horizontalRay',
                id: 'sl-line',
                lock: false,
                points: [{ value: localLines.stopLoss }],
                onPressedMove: (event: any) => {
                    const price = event.overlay.points[0].value;
                    setLocalLines(prev => ({ ...prev, stopLoss: Number(price.toFixed(4)) }));
                },
                onMouseUp: (event: any) => {
                    const price = event.overlay.points[0].value;
                    const finalPrice = Number(price.toFixed(4));
                    setPendingUpdates(prev => ({ ...prev, stopLoss: finalPrice }));
                    if (!activePositionId) onSelectPosition?.('current');
                },
                styles: {
                    line: { color: '#f43f5e', size: isSelected ? 2 : 1 },
                    text: { backgroundColor: '#f43f5e' }
                }
            } as any);
        }

        if (localLines.takeProfit) {
            chart.createOverlay({
                name: 'horizontalRay',
                id: 'tp-line',
                lock: false,
                points: [{ value: localLines.takeProfit }],
                onPressedMove: (event: any) => {
                    const price = event.overlay.points[0].value;
                    setLocalLines(prev => ({ ...prev, takeProfit: Number(price.toFixed(4)) }));
                },
                onMouseUp: (event: any) => {
                    const price = event.overlay.points[0].value;
                    const finalPrice = Number(price.toFixed(4));
                    setPendingUpdates(prev => ({ ...prev, takeProfit: finalPrice }));
                    if (!activePositionId) onSelectPosition?.('current');
                },
                styles: {
                    line: { color: '#34d399', size: isSelected ? 2 : 1 },
                    text: { backgroundColor: '#34d399' }
                }
            } as any);
        }

        chart.createOverlay({
            name: 'horizontalRay',
            id: 'index-line',
            lock: true,
            points: [{ value: marketPrice }],
            styles: {
                line: { color: 'rgba(161, 161, 170, 0.4)', style: 'dashed' as any },
                text: { backgroundColor: 'rgba(161, 161, 170, 0.4)' }
            }
        } as any);

        const execPrice = predictedPrice || marginalPrice;
        chart.createOverlay({
            name: 'horizontalRay',
            id: 'exec-line',
            lock: true,
            points: [{ value: execPrice }],
            styles: {
                line: { color: '#22d3ee' },
                text: { backgroundColor: '#22d3ee' }
            }
        } as any);

    }, [priceLines, localLines, activePositionId, marginalPrice, predictedPrice, marketPrice, side]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || !userTrades.length) return;

        userTrades.forEach((_, i) => chart.removeOverlay({ name: `trade-marker-${i}` }));

        userTrades.forEach((trade, i) => {
            chart.createOverlay({
                name: 'arrow',
                id: `trade-marker-${i}`,
                lock: true,
                points: [{ timestamp: trade.time * 1000, value: trade.price }],
                styles: {
                    line: { color: trade.side === 'buy' ? '#34d399' : '#f43f5e' }
                }
            } as any);
        });
    }, [userTrades]);

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

    const toggleTool = (toolName: string) => {
        if (activeTool === toolName) {
            setActiveTool(null);
            return;
        }
        setActiveTool(toolName);
        chartRef.current?.createOverlay({ name: toolName });
    };

    const handleRemoveAllDrawings = () => {
        const chart = chartRef.current;
        if (!chart) return;

        // System overlay IDs to preserve
        const systemIds = new Set([
            'entry-line',
            'sl-line',
            'tp-line',
            'index-line',
            'exec-line'
        ]);

        // Get all overlays - assuming klinecharts API exposes this or we need to track them.
        // Since getOverlay is common, we try it. If it doesn't return list, we might need another approach.
        // However, standard klinecharts usually lets you remove by group or get list. 
        // If unknown, we can just remove specific types we know users create.

        // Actually, klinecharts v9+ removeOverlay() without args or with specific id.
        // Let's try to remove by group if possible, or iterate known user types.
        // User types: 'segment', 'horizontalRay', 'fibonacciRetracement'

        // A safer standard approach for "Delete All User Drawings" without deleting system ones:
        // We can just rely on the fact that we didn't give user drawings specific IDs (they get auto-generated).
        // System ones have IDs.

        // We will try to get all overlays.
        // chart.getOverlay() usually returns a map or list in v9+.

        const overlays = chart.getOverlays();

        overlays.forEach(o => {
            if (!systemIds.has(o.id) && !o.id.startsWith('trade-marker-')) {
                chart.removeOverlay({ id: o.id });
            }
        });
    };

    // Keyboard listener for deleting selected drawing
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const chart = chartRef.current;
                if (!chart) return;

                // klinecharts internal selection concept
                // Usually we don't have direct access to "selected" state easily unless we track it 
                // or if the library exposes something like getSelectedOverlay().
                // Let's try to just call removeOverlay() with no args? No, that might not work.

                // In many trading libs, you just hook into the event.
                // But klinecharts might handle this internally?
                // If not, we check for a custom solution.

                // Check if we have a tracked selected drawing
                if (selectedDrawing && chart.getOverlays({ id: selectedDrawing }).length > 0) {
                    // Double check existence to prevent errors
                    chart.removeOverlay({ id: selectedDrawing });
                    setSelectedDrawing(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDrawing]);

    return (
        <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#09090b]">
            <AnimatePresence>
                {activePositionId && (
                    <motion.div
                        initial={{ y: 20, opacity: 0, x: '-50%' }}
                        animate={{ y: 0, opacity: 1, x: '-50%' }}
                        exit={{ y: 20, opacity: 0, x: '-50%' }}
                        className="absolute bottom-6 left-1/2 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl"

                    >
                        <button
                            onClick={() => {
                                const currentPrice = data[data.length - 1]?.value || 0;
                                const val = side === 'buy' ? currentPrice * 0.95 : currentPrice * 1.05;
                                setPendingUpdates(prev => ({ ...prev, stopLoss: Number(val.toFixed(4)) }));
                            }}
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
                            onClick={() => {
                                const currentPrice = data[data.length - 1]?.value || 0;
                                const val = side === 'buy' ? currentPrice * 1.05 : currentPrice * 0.95;
                                setPendingUpdates(prev => ({ ...prev, takeProfit: Number(val.toFixed(4)) }));
                            }}
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

            <AnimatePresence>
                {selectedDrawing && (
                    <motion.div
                        initial={{ y: 20, opacity: 0, x: '-50%' }}
                        animate={{ y: 0, opacity: 1, x: '-50%' }}
                        exit={{ y: 20, opacity: 0, x: '-50%' }}
                        className="absolute bottom-16 left-1/2 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10 shadow-2xl"
                    >
                        <span className="text-[10px] text-zinc-400 font-medium px-2">Drawing Selected</span>
                        <div className="w-px h-3 bg-white/10" />
                        <button
                            onClick={() => {
                                chartRef.current?.removeOverlay({ id: selectedDrawing });
                                setSelectedDrawing(null);
                            }}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-xs font-bold"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="absolute left-3 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2 p-1.5 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
                <button
                    onClick={() => setActiveTool(null)}
                    className={`p-2 rounded-lg transition-all ${!activeTool ? 'bg-primary/20 text-primary' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    title="Cursor"
                >
                    <MousePointer2 className="w-4 h-4" />
                </button>
                <div className="w-full h-px bg-white/5 mx-auto" />
                <button
                    onClick={() => toggleTool('segment')}
                    className={`p-2 rounded-lg transition-all ${activeTool === 'segment' ? 'bg-primary/20 text-primary' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    title="Trendline"
                >
                    <TrendingUp className="w-4 h-4" />
                </button>
                <button
                    onClick={() => toggleTool('horizontalRay')}
                    className={`p-2 rounded-lg transition-all ${activeTool === 'horizontalRay' ? 'bg-primary/20 text-primary' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    title="Horizontal Ray"
                >
                    <Minus className="w-4 h-4" />
                </button>
                <button
                    onClick={() => toggleTool('fibonacciRetracement')}
                    className={`p-2 rounded-lg transition-all ${activeTool === 'fibonacciRetracement' ? 'bg-primary/20 text-primary' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                    title="Fibonacci"
                >
                    <Layers className="w-4 h-4" />
                </button>
                <div className="w-full h-px bg-white/5 mx-auto" />
                <button
                    onClick={handleRemoveAllDrawings}
                    className="p-2 rounded-lg transition-all text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10"
                    title="Delete All Drawings"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            <div className="absolute top-3 left-14 z-50 flex gap-1.5 p-1 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl">
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

            <div className="flex items-center justify-end p-3 md:p-4 border-b border-white/5 bg-black/40 backdrop-blur-md z-30">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                </span>
            </div>

            <div className="flex-1 relative">
                <div ref={chartContainerRef} className="w-full h-full" />
            </div>
        </div>
    );
}
