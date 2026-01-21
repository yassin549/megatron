import React, { useEffect, useRef, useState, useMemo } from 'react';
import { init, dispose, Chart, Nullable, Overlay, Styles, DeepPartial, KLineData } from 'klinecharts';
import { Check, X, Shield, Target, MousePointer2, TrendingUp, Minus, Layers } from 'lucide-react';
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
        dispose(container);

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

                    const periodSeconds = params.period.span * (
                        params.period.type === 'minute' ? 60 :
                            params.period.type === 'hour' ? 3600 :
                                params.period.type === 'day' ? 86400 :
                                    params.period.type === 'week' ? 604800 : 0
                    );

                    let finalData = rawData;

                    if (periodSeconds > 60) {
                        // Aggregate
                        const aggregated: typeof rawData = [];
                        let currentBar: typeof rawData[0] | null = null;

                        // Sort to ensure chronological order
                        const sortedData = [...rawData].sort((a, b) => a.timestamp - b.timestamp);

                        sortedData.forEach(point => {
                            const timestamp = Math.floor(point.timestamp / (periodSeconds * 1000)) * (periodSeconds * 1000);

                            if (!currentBar || currentBar.timestamp !== timestamp) {
                                if (currentBar) aggregated.push(currentBar);
                                currentBar = {
                                    timestamp,
                                    open: point.open,
                                    high: point.high,
                                    low: point.low,
                                    close: point.close,
                                    volume: point.volume
                                };
                            } else {
                                if (currentBar) {
                                    currentBar.high = Math.max(currentBar.high, point.high);
                                    currentBar.low = Math.min(currentBar.low, point.low);
                                    currentBar.close = point.close;
                                    currentBar.volume = (currentBar.volume) + (point.volume);
                                }
                            }
                        });
                        if (currentBar) aggregated.push(currentBar);
                        finalData = aggregated;
                    }

                    params.callback(finalData, false);
                },
                subscribeBar: (params) => {
                    // Capture the callback so we can feed it data later
                    subscribeBarRef.current = params.callback;
                },
                unsubscribeBar: () => {
                    subscribeBarRef.current = null;
                }
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
            if (container) dispose(container);
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

    // Reactive Data Updates WITHOUT Re-initialization
    // Reactive Data Updates WITHOUT Re-initialization
    useEffect(() => {
        if (!kLineData.length || !subscribeBarRef.current) return;

        const lastPoint = kLineData[kLineData.length - 1];

        const chart = chartRef.current;
        const period = chart?.getPeriod();

        if (period) {
            const periodSeconds = period.span * (
                period.type === 'minute' ? 60 :
                    period.type === 'hour' ? 3600 :
                        period.type === 'day' ? 86400 :
                            period.type === 'week' ? 604800 : 0
            );

            if (periodSeconds > 60) {
                const timestamp = Math.floor(lastPoint.timestamp / (periodSeconds * 1000)) * (periodSeconds * 1000);
                subscribeBarRef.current({
                    ...lastPoint,
                    timestamp
                });
                return;
            }
        }

        subscribeBarRef.current(lastPoint);
    }, [kLineData]);

    // Handle timeframe changes
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const periodMap: Record<string, { span: number; type: string }> = {
            '1m': { span: 1, type: 'minute' },
            '15m': { span: 15, type: 'minute' },
            '1h': { span: 1, type: 'hour' },
            '1d': { span: 1, type: 'day' },
            '1w': { span: 1, type: 'week' },
            'all': { span: 1, type: 'day' }
        };

        const period = periodMap[activeTimeframe];
        if (period) {
            chart.setPeriod(period as any);
        }
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
