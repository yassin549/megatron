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
    const height = isList ? 40 : 32;
    const width = isList ? 120 : 80;

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
                className="transition-all duration-300"
            />
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
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
    aiConfidence
}: AssetCardProps) {
    const [imageError, setImageError] = useState(false);
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
        >
            <Link
                href={`/assets/${id}`}
                className={`block h-full bg-obsidian-800/80 backdrop-blur-md border border-white/5 rounded-2xl transition-all duration-500 overflow-hidden relative ${isHovering ? 'border-primary/30 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'hover:border-white/10'
                    } ${viewMode === 'list'
                        ? 'flex items-center gap-6 p-4'
                        : 'flex flex-col p-4'
                    }`}
            >
                {/* Border Beam Effect on Hover */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
                </div>

                {/* Header Section */}
                <div className={`flex items-center gap-4 ${viewMode === 'list' ? 'flex-1 min-w-0' : 'mb-4'}`}>
                    <div className="relative">
                        <div className={`relative overflow-hidden rounded-xl bg-obsidian-900 border border-white/10 ${viewMode === 'list' ? 'w-12 h-12' : 'w-12 h-12'
                            }`}>
                            {imageUrl && !imageError ? (
                                <Image
                                    src={imageUrl}
                                    alt={name}
                                    width={48}
                                    height={48}
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-500"
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-600 group-hover:text-primary transition-colors">
                                    <Icon className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        {isFunding && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-obsidian-800 animate-pulse" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-white truncate group-hover:text-primary transition-colors ${viewMode === 'list' ? 'text-base' : 'text-sm'
                            }`}>
                            {name}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-white/5 px-1.5 py-0.5 rounded">
                                {type}
                            </span>
                            {aiConfidence && (
                                <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
                                    <Zap className="w-3 h-3" /> {aiConfidence}%
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Metrics Section */}
                <div className={`flex items-end justify-between ${viewMode === 'list' ? 'gap-8' : 'mt-auto'
                    }`}>
                    {/* Price Block */}
                    <div className={viewMode === 'list' ? 'text-right min-w-[100px]' : ''}>
                        <div className="text-lg font-bold text-white font-mono tracking-tight">
                            ${price.toFixed(2)}
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-neon-emerald' : 'text-neon-rose'
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
                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono">
                                <Activity className="w-3 h-3" />
                                {formatVolume(volume24h)}
                            </div>
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-mono">
                                <Users className="w-3 h-3" />
                                {holders}
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
