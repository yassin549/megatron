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
            {isList && (
                <motion.path
                    layout
                    d={fillPath}
                    fill={`url(#${gradientId})`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                />
            )}
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
            className={`relative group w-full h-[170px] md:h-[185px]`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
        >
            <Link
                href={`/assets/${id}`}
                className={`block h-full bg-zinc-900/80 backdrop-blur-sm border border-white/5 rounded-2xl md:rounded-3xl transition-all duration-500 hover:border-white/10 hover:bg-zinc-900 overflow-hidden ${viewMode === 'list'
                        ? 'flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-6'
                        : 'p-4 md:p-5 flex flex-col justify-between'
                    }`}
            >
                {/* Header: Icon + Name */}
                <motion.div layout className="flex items-center gap-3 md:gap-5 flex-1 min-w-0">
                    {/* Icon */}
                    <motion.div
                        layout
                        className={`relative flex-shrink-0 rounded-xl md:rounded-2xl overflow-hidden bg-zinc-800/80 border border-white/5 ${viewMode === 'list' ? 'w-16 h-16 md:w-20 md:h-20' : 'w-10 h-10 md:w-12 md:h-12'
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
                            className={`font-black text-white truncate group-hover:text-blue-400 transition-colors leading-tight tracking-tight ${viewMode === 'list' ? 'text-lg md:text-xl' : 'text-sm md:text-base'
                                }`}
                        >
                            {name}
                        </motion.h3>
                        <motion.div layout className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] md:text-xs uppercase tracking-[0.2em] text-zinc-500 font-black">{type}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${isFunding ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500 opacity-40'}`} />
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Middle: Chart & Price */}
                <motion.div
                    layout
                    className={`flex items-center justify-between ${viewMode === 'list'
                            ? 'sm:justify-center px-2 sm:px-0 gap-10 md:gap-14'
                            : 'mt-3 md:mt-4'
                        }`}
                >
                    {/* Price & Change */}
                    <motion.div
                        layout
                        className={`flex ${viewMode === 'list'
                                ? 'flex-col sm:hidden'
                                : 'flex-col md:flex-row md:items-baseline gap-1 md:gap-3'
                            }`}
                    >
                        <span className={`font-black text-white tabular-nums tracking-tighter ${viewMode === 'list' ? 'text-xl' : 'text-base md:text-xl'}`}>
                            ${price.toFixed(2)}
                        </span>
                        <span className={`flex items-center gap-0.5 font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'} ${viewMode === 'list' ? 'text-xs' : 'text-xs md:text-sm'}`}>
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <ArrowDownRight className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                            {Math.abs(change24h).toFixed(2)}%
                        </span>
                    </motion.div>

                    {/* The Chart - AREA only in list */}
                    <motion.div layout className="flex-shrink-0">
                        <AssetMiniChart data={priceHistory || []} positive={isPositive} viewMode={viewMode} />
                    </motion.div>
                </motion.div>

                {/* Footer / Right-side Stats */}
                <motion.div
                    layout
                    className={`flex items-center justify-between min-w-fit ${viewMode === 'list'
                            ? 'sm:justify-end gap-8 md:gap-12 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-10'
                            : 'mt-auto pt-2.5 md:pt-3'
                        }`}
                >
                    {/* Desktop Price (List only) */}
                    {viewMode === 'list' && (
                        <div className="hidden sm:flex flex-col items-end min-w-[120px]">
                            <span className="text-2xl font-black text-white tracking-tighter">${price.toFixed(2)}</span>
                            <span className={`flex items-center gap-0.5 text-sm font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {Math.abs(change24h).toFixed(2)}%
                            </span>
                        </div>
                    )}

                    {/* Informational Stats - Conditional Labels */}
                    <motion.div layout className="flex items-center gap-6 md:gap-8">
                        <div className={`flex items-center ${viewMode === 'list' ? 'flex-col items-start' : 'gap-1.5'} text-zinc-500 group-hover:text-zinc-400 transition-colors`}>
                            <TrendingUp className={`w-3.5 h-3.5 ${viewMode === 'list' ? 'hidden' : 'inline text-zinc-600'}`} />
                            <span className={`text-[10px] md:text-xs text-zinc-600 uppercase font-black tracking-tighter ${viewMode === 'list' ? 'block mb-0.5' : 'hidden'}`}>Volume</span>
                            <span className="text-xs md:text-sm font-mono font-black text-zinc-200">{formatVolume(volume24h)}</span>
                        </div>
                        <div className={`flex items-center ${viewMode === 'list' ? 'flex-col items-start' : 'gap-1.5'} text-zinc-500 group-hover:text-zinc-400 transition-colors`}>
                            <Users className={`w-3.5 h-3.5 ${viewMode === 'list' ? 'hidden' : 'inline text-zinc-600'}`} />
                            <span className={`text-[10px] md:text-xs text-zinc-600 uppercase font-black tracking-tighter ${viewMode === 'list' ? 'block mb-0.5' : 'hidden'}`}>Holders</span>
                            <span className="text-xs md:text-sm font-mono font-black text-zinc-200">{holders}</span>
                        </div>
                        {isFunding && (
                            <div className={`flex items-center ${viewMode === 'list' ? 'flex-col items-start' : 'gap-1.5'} text-yellow-500/80`}>
                                <Activity className={`w-3.5 h-3.5 ${viewMode === 'list' ? 'hidden' : 'inline text-yellow-600/60'}`} />
                                <span className={`text-[10px] md:text-xs text-yellow-600/60 uppercase font-black tracking-tighter ${viewMode === 'list' ? 'block mb-0.5' : 'hidden'}`}>Goal</span>
                                <span className="text-xs md:text-sm font-mono font-black text-yellow-400">{fundingProgress?.toFixed(0)}%</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Bookmark Button */}
                    <motion.div layout className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={handleToggleBookmark}
                            className={`p-2.5 md:p-3.5 rounded-2xl transition-all duration-300 ${isBookmarked
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                    : 'text-zinc-600 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                    </motion.div>
                </motion.div>
            </Link>

            {/* Flying Tooltip */}
            {isHovering && hasMouseMoved && (typeof window !== 'undefined' && window.innerWidth >= 768) && (typeof document !== 'undefined') && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none p-5 max-w-[300px] bg-zinc-950/98 backdrop-blur-2xl border border-blue-500/30 rounded-2xl shadow-2xl"
                    style={tooltipStyle}
                >
                    <div className="flex items-start gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2.5 flex-shrink-0 animate-pulse" />
                        <div>
                            <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1.5 block">Mega-AI Market Analysis</span>
                            <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                                {displayedText}
                                <span className="inline-block w-1.5 h-3 bg-blue-400 ml-1 animate-pulse" />
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </motion.div>
    );
}
