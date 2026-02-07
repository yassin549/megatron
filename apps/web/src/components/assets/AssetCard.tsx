'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    Activity,
    Users,
    Trophy,
    LineChart,
    CloudSun,
    Bitcoin,
    Vote,
    Microscope,
    LayoutGrid,
    ArrowUpRight,
    ArrowDownRight,
    Bookmark,
    TrendingUp,
    Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeAssetData } from '@/hooks/useRealtimeAssetData';
import { PressureGauge } from './PressureGauge';

// Typewriter Effect Component


interface AssetCardProps {
    id: string;
    name: string;
    type: string;
    price: number;
    change24h: number;
    volume24h: number;
    status: 'active' | 'funding' | 'paused';
    fundingProgress?: number;
    softCap?: number;
    isAuthenticated?: boolean;
    lastFundamental?: number | null;
    aiConfidence?: number | null;
    aiSummary?: string | null;
    description?: string | null;
    imageUrl?: string;
    isBookmarked?: boolean;
    holders?: number;
    priceHistory?: number[];
    viewMode?: 'grid' | 'list';
    activeTimeframe?: string;
    pressure?: number;
    marketCap?: number;
}

const TYPE_ICONS: Record<string, any> = {
    social: Users,
    sports: Trophy,
    economics: LineChart,
    weather: CloudSun,
    crypto: Bitcoin,
    politics: Vote,
    science: Microscope,
    active: Activity
};

// Enhanced Mini Chart Component
function AssetMiniChart({ data, positive, viewMode }: { data: number[]; positive: boolean, viewMode: 'grid' | 'list' }) {
    if (!data || data.length < 2) {
        // Fallback smooth curve relative to positive/negative
        const fakeData = positive
            ? [10, 10.5, 11, 10.8, 11.2, 11.5, 12]
            : [12, 11.5, 11.2, 10.8, 11, 10.5, 10];
        data = fakeData;
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;
    // Dimensions
    const isList = viewMode === 'list';
    const height = isList ? 60 : 50; // Grid height 70 -> 50
    const width = isList ? 200 : 140; // Grid width 160 -> 140

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return { x, y };
    });

    // Create a smooth SVG path string (Simple Bezier)
    const linePath = points.map((p, i) => {
        if (i === 0) return `M ${p.x},${p.y}`;
        const prev = points[i - 1];
        const cp1x = prev.x + (p.x - prev.x) / 2;
        return `C ${cp1x},${prev.y} ${cp1x},${p.y} ${p.x},${p.y}`;
    }).join(' ');

    const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;

    // Colors aligned with new palette
    const color = positive ? '#10B981' : '#F43F5E'; // Emerald : Rose
    const gradientId = `chart-grad-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <svg width={width} height={height} className="overflow-visible">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={fillPath}
                fill={`url(#${gradientId})`}
                className="transition-all duration-150"
            />
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-150"
            />
        </svg>
    );
}

export function AssetCard({
    id,
    name,
    type,
    price,
    change24h,
    volume24h,
    status,
    fundingProgress,
    imageUrl,
    description,
    aiSummary,
    isBookmarked: initialIsBookmarked,
    isAuthenticated,
    holders = 0,
    priceHistory,
    viewMode = 'grid',
    activeTimeframe,
    marketCap = 0,
    aiConfidence,
    pressure: initialPressure = 50
}: AssetCardProps) {
    const [imageError, setImageError] = useState(false);
    const { price: livePrice, pressure: livePressure } = useRealtimeAssetData(id, price, initialPressure);
    const isPositive = change24h >= 0;
    const Icon = TYPE_ICONS[type] || LayoutGrid;
    const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked || false);
    const isFunding = status?.toLowerCase() === 'funding';
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        if (typeof initialIsBookmarked === 'boolean') {
            setIsBookmarked(initialIsBookmarked);
        }
    }, [initialIsBookmarked]);

    const handleToggleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) return;

        const newState = !isBookmarked;
        setIsBookmarked(newState);

        try {
            await fetch('/api/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: id })
            });
        } catch {
            setIsBookmarked(!newState);
        }
    };

    const formatVolume = (vol: number) => {
        if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
        if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`;
        return `$${vol.toFixed(0)}`;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ y: -4 }}
            className={`relative group ${viewMode === 'grid' ? 'h-full' : 'w-full'}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onTouchStart={() => setIsHovering(true)}
            onTouchEnd={() => setIsHovering(false)}
        >
            <Link
                href={`/assets/${id}`}
                className={`block h-full bg-card backdrop-blur-md border border-border/60 rounded-xl transition-all duration-300 overflow-hidden relative ${isHovering ? 'border-primary/50 shadow-[0_0_25px_rgba(59,130,246,0.3)]' : 'hover:border-border/80'
                    } ${viewMode === 'list'
                        ? 'flex items-center gap-6 p-3'
                        : 'flex flex-col p-3'
                    }`}
            >
                {/* Border Beam Effect on Hover */}
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                </div>

                {/* Hover Description Overlay */}
                <AnimatePresence>
                    {isHovering && viewMode === 'grid' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 text-center rounded-xl overflow-hidden"
                        >
                            {/* Background Layers */}
                            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-opacity duration-300">
                                {imageUrl && !imageError ? (
                                    <div className="absolute inset-0">
                                        <Image
                                            src={imageUrl}
                                            alt={name}
                                            fill
                                            className="object-cover opacity-100 transition-transform duration-700 group-hover:scale-[1.1]"
                                            onError={() => setImageError(true)}
                                            unoptimized={imageUrl.startsWith('/uploads')}
                                        />
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.85)_0%,_rgba(0,0,0,0.6)_100%)]" />
                                    </div>
                                ) : imageUrl && imageError ? (
                                    <div className="absolute inset-0">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imageUrl}
                                            alt={name}
                                            className="absolute inset-0 w-full h-full object-cover opacity-100 transition-transform duration-700 group-hover:scale-[1.1]"
                                        />
                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.85)_0%,_rgba(0,0,0,0.6)_100%)]" />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(12,12,12,0.9)_0%,_rgba(12,12,12,0.7)_100%)] transition-colors duration-500">
                                        <Icon className="w-48 h-48 text-primary opacity-10 blur-[1px] transition-all duration-500 group-hover:opacity-20 group-hover:scale-110" />
                                    </div>
                                )}
                            </div>

                            <div className="relative z-10 w-full">
                                {/* Bookmark Button - Top Right */}
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={handleToggleBookmark}
                                    className={`absolute -top-10 right-0 p-2 rounded-full transition-all border ${isBookmarked
                                        ? 'text-primary bg-primary/10 border-primary/20'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/10 border-white/10'
                                        }`}
                                >
                                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                                </motion.button>

                                {/* Name */}
                                <motion.h3
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 }}
                                    className="text-xl font-bold text-foreground mb-3 leading-tight"
                                >
                                    {name}
                                </motion.h3>

                                {/* Description */}
                                {description && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.15 }}
                                        className="text-xs text-zinc-100 font-semibold leading-relaxed line-clamp-6 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                                    >
                                        {description}
                                    </motion.p>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pressure Gauge - Moved to bottom footer */}

                {/* Header Section */}
                <div className={`flex items-center gap-4 ${viewMode === 'list' ? 'flex-1 min-w-0' : 'mb-4'} relative z-10`}>
                    <div className="relative">
                        <div className={`relative overflow-hidden rounded-xl bg-secondary/20 border border-border/50 ${viewMode === 'list' ? 'w-12 h-12' : 'w-12 h-12 md:w-16 md:h-16'
                            }`}>
                            {/* Fallback Icon (Always rendered underneath) */}
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 group-hover:text-primary transition-colors">
                                <Icon className="w-6 h-6" />
                            </div>

                            {/* Image Layer */}
                            {imageUrl && !imageError ? (
                                <Image
                                    src={imageUrl}
                                    alt={name}
                                    width={48}
                                    height={48}
                                    className="object-cover w-full h-full relative z-10 group-hover:scale-110 transition-transform duration-300"
                                    onError={() => setImageError(true)}
                                    unoptimized={imageUrl.startsWith('/uploads')}
                                />
                            ) : imageUrl && imageError ? (
                                // Fallback to standard img tag if next/image fails
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={imageUrl}
                                    alt={name}
                                    className="object-cover w-full h-full relative z-10 group-hover:scale-110 transition-transform duration-300"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            ) : null}
                        </div>
                        {isFunding && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-obsidian-800 animate-pulse" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0 pr-4">
                        <h3 className={`font-black text-white line-clamp-2 group-hover:text-primary transition-colors ${viewMode === 'list' ? 'text-base' : 'text-sm md:text-xl tracking-tight leading-tight'
                            }`}>
                            {name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground font-black bg-secondary/40 px-2 py-0.5 rounded">
                                {type}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Metrics Section */}
                <div className={`flex items-end justify-between ${viewMode === 'list' ? 'gap-8' : 'mt-auto'} relative z-10`}>
                    {/* Price Block */}
                    <div className={viewMode === 'list' ? 'text-right min-w-[100px]' : ''}>
                        <div className="text-xl md:text-3xl font-black text-foreground font-mono tracking-tighter">
                            ${livePrice.toFixed(2)}
                        </div>
                        <div className={`flex items-center gap-1 text-sm md:text-base font-bold ${isPositive ? 'text-neon-emerald' : 'text-neon-rose'
                            } ${viewMode === 'list' ? 'justify-end' : ''}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(change24h).toFixed(2)}%
                        </div>
                    </div>

                    {/* Chart (Hidden on small mobile list) */}
                    <div className={`${viewMode === 'list' ? 'hidden sm:block' : ''}`}>
                        <AssetMiniChart
                            data={priceHistory || []}
                            positive={isPositive}
                            viewMode={viewMode}
                        />
                    </div>

                    {/* Meta Stats (List View Only) */}
                    {viewMode === 'list' && (
                        <div className="hidden md:flex items-center gap-6 text-xs text-zinc-400 font-mono">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase text-zinc-600 font-bold">Vol</span>
                                {formatVolume(volume24h)}
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] uppercase text-zinc-600 font-bold">Holders</span>
                                {holders}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Stats (Grid View Only) */}
                {viewMode === 'grid' && (
                    <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                        <div className="flex-1 mr-4 flex items-center gap-4">
                            <PressureGauge value={livePressure} size="sm" />

                            {/* Desktop Metadata Block */}
                            <div className="hidden md:flex items-center gap-6 text-sm font-mono whitespace-nowrap border-l border-border/40 pl-5">
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 uppercase text-[9px] font-bold">Vol 24h</span>
                                    <span className="text-white font-black text-base">{formatVolume(volume24h)}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 uppercase text-[9px] font-bold">Holders</span>
                                    <span className="text-white font-black text-base">{holders.toLocaleString()}</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-zinc-500 uppercase text-[9px] font-bold">Mkt Cap</span>
                                    <span className="text-white font-black text-base">{formatVolume(marketCap)}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleToggleBookmark}
                            className={`p-1.5 rounded-lg transition-all ${isBookmarked
                                ? 'text-neon-blue bg-blue-500/10'
                                : 'text-zinc-600 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                )}
            </Link>
        </motion.div>
    );
}
