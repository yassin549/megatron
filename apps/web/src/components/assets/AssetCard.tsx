'use client';

import Link from 'next/link';
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
    TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';

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
        const fakeData = positive
            ? [10, 12, 11, 14, 13, 16, 15, 18]
            : [18, 16, 17, 14, 15, 12, 13, 10];
        data = fakeData;
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;

    // Proportional dimensions
    const isList = viewMode === 'list';
    const height = isList ? 40 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 24 : 32);
    const width = isList ? 120 : (typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 80);

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

    const color = positive ? '#34d399' : '#f43f5e'; // Emerald-400 : Rose-500
    const gradientId = `chart-grad-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <motion.svg
            layout
            width={width}
            height={height}
            className="overflow-visible"
        >
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <motion.path
                layout
                d={fillPath}
                fill={`url(#${gradientId})`}
                transition={{ duration: 0.4 }}
            />
            <motion.path
                layout
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth={isList ? 2 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                transition={{ duration: 0.4 }}
            />
        </motion.svg>
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
    viewMode = 'grid'
}: AssetCardProps & { viewMode?: 'grid' | 'list' }) {
    const isPositive = change24h >= 0;
    const Icon = TYPE_ICONS[type] || LayoutGrid;
    const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked || false);
    const isFunding = status?.toLowerCase() === 'funding';

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
            const res = await fetch('/api/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: id })
            });
            if (!res.ok) setIsBookmarked(!newState);
        } catch {
            setIsBookmarked(!newState);
        }
    };

    const formatVolume = (vol: number) => {
        if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}M`;
        if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}K`;
        return `$${vol.toFixed(0)}`;
    };

    // Tooltip state
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const typingInterval = useRef<NodeJS.Timeout | null>(null);
    const [imgError, setImgError] = useState(false);

    const fullDescription = (description || aiSummary || "AI analysis pending...")
        .split('undefined').join('').trim();

    // Ensure we have a valid string for typing animation
    const safeDescription = fullDescription.length > 0 ? fullDescription : "AI analysis pending...";

    useEffect(() => {
        if (isHovering) {
            let idx = 0;
            setDisplayedText('');
            if (typingInterval.current) clearInterval(typingInterval.current);
            typingInterval.current = setInterval(() => {
                if (idx < safeDescription.length) {
                    const char = safeDescription.charAt(idx);
                    setDisplayedText(prev => prev + char);
                    idx++;
                } else {
                    if (typingInterval.current) clearInterval(typingInterval.current);
                }
            }, 10);
        } else {
            setDisplayedText('');
            if (typingInterval.current) clearInterval(typingInterval.current);
        }
        return () => { if (typingInterval.current) clearInterval(typingInterval.current); };
    }, [isHovering, fullDescription]);

    const handleMouseMove = (e: React.MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    const isNearBottom = typeof window !== 'undefined' && mousePos.y > window.innerHeight - 220;
    const isNearRight = typeof window !== 'undefined' && mousePos.x > window.innerWidth - 320;
    const hasMouseMoved = mousePos.x !== 0 || mousePos.y !== 0;

    const tooltipStyle: React.CSSProperties = {
        left: isNearRight ? `${mousePos.x - 290}px` : `${mousePos.x + 16}px`,
        top: isNearBottom ? `${mousePos.y - 140}px` : `${mousePos.y + 16}px`
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`relative group ${viewMode === 'grid' ? 'h-[160px] md:h-[185px]' : 'w-full'}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
        >
            <Link
                href={`/assets/${id}`}
                className={`block bg-zinc-900/80 backdrop-blur-sm border border-white/5 rounded-xl md:rounded-2xl transition-all duration-500 hover:border-white/20 hover:bg-zinc-900 overflow-hidden ${viewMode === 'list'
                    ? 'flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-5'
                    : 'h-full p-3 md:p-4 flex flex-col justify-between'
                    }`}
            >
                {/* Header: Icon + Name */}
                <motion.div layout className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    {/* Larger Icon */}
                    <motion.div
                        layout
                        className={`relative flex-shrink-0 rounded-xl md:rounded-2xl overflow-hidden bg-zinc-800/80 border border-white/5 ${viewMode === 'list' ? 'w-14 h-14 md:w-16 md:h-16' : 'w-14 h-14 md:w-16 md:h-16'
                            }`}
                    >
                        {!imgError && imageUrl ? (
                            <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={() => setImgError(true)} />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-500"><Icon className="w-8 h-8" /></div>
                        )}
                    </motion.div>

                    {/* Name & Type */}
                    <motion.div layout className="flex-1 min-w-0">
                        <motion.h3
                            layout
                            className={`font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors leading-tight ${viewMode === 'list' ? 'text-base md:text-lg' : 'text-sm md:text-base'
                                }`}
                        >
                            {name}
                        </motion.h3>
                        {viewMode === 'list' && (
                            <motion.div layout className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-500 font-bold">{type}</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${isFunding ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400 opacity-50'}`} />
                            </motion.div>
                        )}
                    </motion.div>
                </motion.div>

                {/* Middle: Chart & Price */}
                <motion.div
                    layout
                    className={`flex items-center justify-between ${viewMode === 'list'
                        ? 'sm:justify-center px-2 sm:px-0 gap-8'
                        : 'mt-2 md:mt-3'
                        }`}
                >
                    {/* Price & Change (Conditional placement) */}
                    <motion.div
                        layout
                        className={`flex ${viewMode === 'list'
                            ? 'flex-col sm:hidden'
                            : 'flex-col md:flex-row md:items-baseline gap-0.5 md:gap-2'
                            }`}
                    >
                        <span className={`font-black text-white tabular-nums ${viewMode === 'list' ? 'text-lg' : 'text-sm md:text-lg'}`}>
                            ${price.toFixed(2)}
                        </span>
                        <span className={`flex items-center gap-0.5 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'} ${viewMode === 'list' ? 'text-xs' : 'text-[10px] md:text-xs'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(change24h).toFixed(2)}%
                        </span>
                    </motion.div>

                    {/* The Chart */}
                    <motion.div layout className="flex-shrink-0">
                        <AssetMiniChart data={priceHistory || []} positive={isPositive} viewMode={viewMode} />
                    </motion.div>
                </motion.div>

                {/* Footer / Right-side Stats */}
                <motion.div
                    layout
                    className={`flex items-center justify-between min-w-fit ${viewMode === 'list'
                        ? 'sm:justify-end gap-6 border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-6'
                        : 'mt-auto pt-1.5 md:pt-2'
                        }`}
                >
                    {/* Desktop Price (List only) */}
                    {viewMode === 'list' && (
                        <div className="hidden sm:flex flex-col items-end min-w-[100px]">
                            <span className="text-xl font-black text-white tracking-tight">${price.toFixed(2)}</span>
                            <span className={`flex items-center gap-0.5 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(change24h).toFixed(2)}%
                            </span>
                        </div>
                    )}

                    {/* Informational Stats */}
                    <motion.div layout className="flex items-center gap-4 md:gap-5 overflow-hidden">
                        <div className="flex items-center sm:flex-col gap-1.5 sm:gap-0 text-zinc-500 group-hover:text-zinc-400">
                            {viewMode === 'grid' ? <TrendingUp className="w-2.5 h-2.5" /> : <span className="text-[8px] md:text-[10px] text-zinc-600 uppercase font-black tracking-tighter">Vol</span>}
                            <span className="text-[10px] md:text-xs font-mono font-bold">{formatVolume(volume24h)}</span>
                        </div>
                        <div className="flex items-center sm:flex-col gap-1.5 sm:gap-0 text-zinc-500 group-hover:text-zinc-400">
                            {viewMode === 'grid' ? <Users className="w-2.5 h-2.5" /> : <span className="text-[8px] md:text-[10px] text-zinc-600 uppercase font-black tracking-tighter">Holders</span>}
                            <span className="text-[10px] md:text-xs font-mono font-bold">{holders}</span>
                        </div>
                        {isFunding && (
                            <div className="flex items-center sm:flex-col gap-1.5 sm:gap-0 text-yellow-500/80">
                                {viewMode === 'grid' ? <Activity className="w-2.5 h-2.5" /> : <span className="text-[8px] md:text-[10px] text-yellow-600/80 uppercase font-black tracking-tighter">Goal</span>}
                                <span className="text-[10px] md:text-xs font-mono font-bold">{fundingProgress?.toFixed(0)}%</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Status & Bookmark */}
                    <motion.div layout className="flex items-center gap-2 md:gap-4">
                        {/* Grid Only Status */}
                        {viewMode === 'grid' && (
                            <div className="flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isFunding ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
                                <span className={`text-[8px] md:text-[10px] font-medium ${isFunding ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                    {isFunding ? 'Funding' : 'Live'}
                                </span>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={handleToggleBookmark}
                            className={`p-1.5 md:p-2.5 rounded-xl transition-all ${isBookmarked
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'text-zinc-600 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Bookmark className={`w-4 h-4 md:w-5 md:h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                    </motion.div>
                </motion.div>
            </Link>

            {/* Flying Tooltip */}
            {isHovering && hasMouseMoved && (typeof window !== 'undefined' && window.innerWidth >= 768) && (typeof document !== 'undefined') && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none p-4 max-w-[280px] bg-zinc-950/95 backdrop-blur-xl border border-blue-500/30 rounded-xl shadow-2xl"
                    style={tooltipStyle}
                >
                    <div className="flex items-start gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0 animate-pulse" />
                        <div>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1 block">Mega-AI Insight</span>
                            <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                                {displayedText}
                                <span className="inline-block w-1.5 h-3 bg-blue-400 ml-0.5 animate-pulse" />
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </motion.div>
    );
}
