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
            className={`relative ${viewMode === 'grid' ? 'h-full' : 'w-full'} perspective-1000`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <Link
                href={`/assets/${id}`}
                className={`block h-full relative preserve-3d transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isHovering && viewMode === 'grid' ? '[transform:rotateX(90deg)]' : ''
                    }`}
            >
                {/* FRONT FACE - Asset Info */}
                <div className={`h-full bg-obsidian-800/80 backdrop-blur-md border border-white/5 rounded-md p-3 flex flex-col relative [backface-visibility:hidden] ${isHovering ? 'border-primary/30' : 'hover:border-white/10'
                    } ${viewMode === 'list' ? 'flex-row items-center gap-6' : 'flex-col'}`}>

                    {/* Header Section */}
                    <div className={`flex items-center gap-4 ${viewMode === 'list' ? 'flex-1 min-w-0' : 'mb-4'} relative z-10`}>
                        <div className="relative">
                            <div className={`relative overflow-hidden rounded bg-obsidian-900 border border-white/10 ${viewMode === 'list' ? 'w-12 h-12' : 'w-12 h-12'}`}>
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                                    <Icon className="w-6 h-6" />
                                </div>
                                {imageUrl && !imageError ? (
                                    <Image
                                        src={imageUrl}
                                        alt={name}
                                        width={48}
                                        height={48}
                                        className="object-cover w-full h-full relative z-10"
                                        onError={() => setImageError(true)}
                                        unoptimized={imageUrl.startsWith('/uploads')}
                                    />
                                ) : null}
                            </div>
                            {isFunding && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full border-2 border-obsidian-800 animate-pulse" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className={`font-bold text-white line-clamp-2 ${viewMode === 'list' ? 'text-base' : 'text-sm'}`}>
                                {name}
                            </h3>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold bg-white/5 px-1.5 py-0.5 rounded">
                                    {type}
                                </span>
                                {aiConfidence && (
                                    <span className="flex items-center gap-1 text-[10px] text-blue-400 font-mono">
                                        <Zap className="w-3 h-3" /> {(aiConfidence * 100).toFixed(0)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Metrics Section */}
                    <div className={`flex items-end justify-between ${viewMode === 'list' ? 'gap-8' : 'mt-auto'} relative z-10`}>
                        <div className={viewMode === 'list' ? 'text-right min-w-[100px]' : ''}>
                            <div className="text-lg font-bold text-white font-mono tracking-tight">
                                ${price.toFixed(2)}
                            </div>
                            <div className={`flex items-center gap-1 text-xs font-bold ${isPositive ? 'text-neon-emerald' : 'text-neon-rose'} ${viewMode === 'list' ? 'justify-end' : ''}`}>
                                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(change24h).toFixed(2)}%
                            </div>
                        </div>

                        <div className={`${viewMode === 'list' ? 'hidden sm:block' : ''}`}>
                            <AssetMiniChart
                                data={priceHistory || []}
                                positive={isPositive}
                                viewMode={viewMode}
                            />
                        </div>
                    </div>

                    {/* Grid Footer (Only in Grid Mode) */}
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
                            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'text-primary fill-current' : 'text-zinc-600'}`} />
                        </div>
                    )}
                </div>

                {/* BACK FACE (BOTTOM) - Description */}
                {viewMode === 'grid' && (
                    <div className="absolute inset-0 bg-[#0A0B14] border border-primary/20 rounded-md p-6 flex flex-col items-center justify-center text-center [transform:rotateX(-90deg)] [backface-visibility:hidden]">
                        <h3 className="text-base font-bold text-white mb-3">
                            {name}
                        </h3>
                        {description && (
                            <p className="text-[11px] text-zinc-400 font-medium leading-relaxed line-clamp-6">
                                {description}
                            </p>
                        )}
                        <div className="mt-6 inline-flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest bg-primary/10 px-4 py-2 rounded-sm border border-primary/20">
                            Explore_Market_Node <LineChart className="w-3 h-3" />
                        </div>
                    </div>
                )}
            </Link>
        </motion.div>
    );
}
