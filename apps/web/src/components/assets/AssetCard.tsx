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

    const color = positive ? '#10b981' : '#f43f5e'; // Emerald-500 : Rose-500
    const glowId = `glow-${Math.random().toString(36).substr(2, 9)}`;
    const gradientId = `chart-grad-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <motion.svg
            layout
            width={width}
            height={height}
            className="overflow-visible"
        >
            <defs>
                <filter id={glowId}>
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.15" />
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
                filter={`url(#${glowId})`}
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
                className={`block h-full bg-zinc-900/60 backdrop-blur-md border border-white/5 rounded-2xl md:rounded-[2rem] transition-all duration-500 hover:border-white/10 hover:bg-zinc-900/80 overflow-hidden ${viewMode === 'list'
                        ? 'flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-6'
                        : 'p-4 md:p-5 flex flex-col'
                    }`}
            >
                {/* 1. Header: Icon + Name Group */}
                <motion.div layout className="flex items-center gap-3 md:gap-4 flex-shrink-0">
                    <motion.div
                        layout
                        className={`relative flex-shrink-0 rounded-xl md:rounded-2xl overflow-hidden bg-zinc-800 border border-white/5 ${viewMode === 'list' ? 'w-16 h-16 md:w-20 md:h-20' : 'w-10 h-10 md:w-11 md:h-11'
                            }`}
                    >
                        {!imgError && imageUrl ? (
                            <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={() => setImgError(true)} />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 bg-zinc-800"><Icon className="w-6 h-6" /></div>
                        )}
                    </motion.div>

                    <motion.div layout className="flex-1 min-w-0">
                        <motion.h3
                            layout
                            className={`font-bold text-white truncate tracking-tight group-hover:text-blue-400 transition-colors ${viewMode === 'list' ? 'text-lg md:text-xl' : 'text-sm md:text-base'
                                }`}
                        >
                            {name}
                        </motion.h3>
                        <motion.div layout className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-zinc-500">{type}</span>
                            <span className={`w-1 h-1 rounded-full ${isFunding ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-500/40'}`} />
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* 2. Main Content: Price & Sparkline Area */}
                <motion.div
                    layout
                    className={`flex items-center justify-between flex-1 ${viewMode === 'list'
                            ? 'sm:justify-center px-4 md:px-12 gap-10 md:gap-16'
                            : 'mt-auto py-2'
                        }`}
                >
                    <motion.div
                        layout
                        className={`flex ${viewMode === 'list'
                                ? 'flex-col sm:hidden'
                                : 'flex-col items-start gap-0.5'
                            }`}
                    >
                        <span className={`font-black text-white tabular-nums tracking-tight ${viewMode === 'list' ? 'text-xl' : 'text-lg md:text-2xl'}`}>
                            ${price.toFixed(2)}
                        </span>
                        <span className={`flex items-center gap-1 font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'} ${viewMode === 'list' ? 'text-xs md:text-sm' : 'text-xs md:text-sm'}`}>
                            {isPositive ? <ArrowUpRight className="w-3 h-3 md:w-3.5 md:h-3.5" /> : <ArrowDownRight className="w-3 h-3 md:w-3.5 md:h-3.5" />}
                            {Math.abs(change24h).toFixed(2)}%
                        </span>
                    </motion.div>

                    <motion.div layout className="flex-shrink-0 pr-1">
                        <AssetMiniChart data={priceHistory || []} positive={isPositive} viewMode={viewMode} />
                    </motion.div>
                </motion.div>

                {/* 3. Footer / Stats Row */}
                <motion.div
                    layout
                    className={`flex items-center justify-between min-w-fit flex-shrink-0 ${viewMode === 'list'
                            ? 'sm:justify-end gap-10 md:gap-14 border-t sm:border-t-0 sm:border-l border-white/5 pt-4 sm:pt-0 sm:pl-10'
                            : 'mt-auto pt-3 border-t border-white/5'
                        }`}
                >
                    {/* Desktop Highlight Stats (List Only) */}
                    {viewMode === 'list' && (
                        <div className="hidden sm:flex flex-col items-end min-w-[120px]">
                            <span className="text-2xl md:text-3xl font-black text-white tracking-tighter tabular-nums">${price.toFixed(2)}</span>
                            <span className={`flex items-center gap-1 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                                {Math.abs(change24h).toFixed(2)}%
                            </span>
                        </div>
                    )}

                    {/* Secondary Metrics Row */}
                    <motion.div layout className="flex items-center gap-4 md:gap-6">
                        <div className={`flex items-center ${viewMode === 'list' ? 'flex-col items-start' : 'gap-1.5'} group/stat`}>
                            <TrendingUp className={`w-3 h-3 text-zinc-600 ${viewMode === 'list' ? 'hidden' : 'inline'}`} />
                            <span className={`text-[9px] text-zinc-600 uppercase font-black tracking-tighter ${viewMode === 'list' ? 'mb-0.5' : 'hidden'}`}>Volume</span>
                            <span className="text-[10px] md:text-xs font-mono font-bold text-zinc-400 tabular-nums">{formatVolume(volume24h)}</span>
                        </div>
                        <div className={`flex items-center ${viewMode === 'list' ? 'flex-col items-start' : 'gap-1.5'} group/stat`}>
                            <Users className={`w-3 h-3 text-zinc-600 ${viewMode === 'list' ? 'hidden' : 'inline'}`} />
                            <span className={`text-[9px] text-zinc-600 uppercase font-black tracking-tighter ${viewMode === 'list' ? 'mb-0.5' : 'hidden'}`}>Holders</span>
                            <span className="text-[10px] md:text-xs font-mono font-bold text-zinc-400 tabular-nums">{holders}</span>
                        </div>
                        {isFunding && (
                            <div className={`flex items-center ${viewMode === 'list' ? 'flex-col items-start' : 'gap-1.5'} text-yellow-500/60`}>
                                <Activity className={`w-3 h-3 ${viewMode === 'list' ? 'hidden' : 'inline'}`} />
                                <span className={`text-[9px] uppercase font-black tracking-tighter ${viewMode === 'list' ? 'mb-0.5' : 'hidden'}`}>Goal</span>
                                <span className="text-[10px] md:text-xs font-mono font-bold tabular-nums">{fundingProgress?.toFixed(0)}%</span>
                            </div>
                        )}
                    </motion.div>

                    {/* Actions */}
                    <motion.div layout className="flex items-center">
                        <button
                            type="button"
                            onClick={handleToggleBookmark}
                            className={`p-2 rounded-xl transition-all duration-300 ${isBookmarked
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10'
                                    : 'text-zinc-600 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                        >
                            <Bookmark className={`w-4 h-4 md:w-5 md:h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                    </motion.div>
                </motion.div>
            </Link>

            {/* Flying AI Portal Tooltip */}
            {isHovering && hasMouseMoved && (typeof window !== 'undefined' && window.innerWidth >= 768) && (typeof document !== 'undefined') && createPortal(
                <div
                    className="fixed z-[9999] pointer-events-none p-5 max-w-[320px] bg-zinc-950/98 backdrop-blur-3xl border border-blue-500/20 rounded-2xl shadow-2xl"
                    style={tooltipStyle}
                >
                    <div className="flex items-start gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0 animate-pulse" />
                        <div>
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">AI Synthesis Layer</span>
                            <p className="text-xs text-zinc-300 font-mono leading-relaxed opacity-90">
                                {displayedText}
                                <span className="inline-block w-1 h-3 bg-blue-400/80 ml-1 animate-pulse align-middle" />
                            </p>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </motion.div>
    );
}
