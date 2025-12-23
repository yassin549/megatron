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

// Mini Sparkline Component
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
    if (!data || data.length < 2) {
        // Fallback: generate fake upward/downward trend
        const fakeData = positive
            ? [10, 12, 11, 14, 13, 16, 15, 18]
            : [18, 16, 17, 14, 15, 12, 13, 10];
        data = fakeData;
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    // Responsive height/width
    const height = typeof window !== 'undefined' && window.innerWidth < 768 ? 24 : 32;
    const width = typeof window !== 'undefined' && window.innerWidth < 768 ? 60 : 80;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const lineColor = positive ? '#3b82f6' : '#f43f5e';
    const gradientId = `sparkline-${positive ? 'pos' : 'neg'}-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <svg width={width} height={height} className="opacity-60 group-hover:opacity-100 transition-opacity">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={`M${points.split(' ').map((p, i) => i === 0 ? p : ` L${p}`).join('')}`}
                fill="none"
                stroke={lineColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d={`M0,${height} ${points.split(' ').map((p, i) => {
                    const [x, y] = p.split(',');
                    return `L${x},${y}`;
                }).join(' ')} L${width},${height} Z`}
                fill={`url(#${gradientId})`}
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

    if (viewMode === 'list') {
        return (
            <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative group w-full"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onMouseMove={handleMouseMove}
            >
                <Link
                    href={`/assets/${id}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-4 bg-zinc-900/80 backdrop-blur-sm border border-white/5 rounded-2xl p-4 md:p-5 hover:border-white/10 hover:bg-zinc-900 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-blue-500/5"
                >
                    {/* Primary Row: Icon + Name + Price */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Larger Icon */}
                        <div className="relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0 rounded-xl md:rounded-2xl overflow-hidden bg-zinc-800/80 border border-white/5">
                            {!imgError && imageUrl ? (
                                <img src={imageUrl} alt={name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" onError={() => setImgError(true)} />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-500"><Icon className="w-8 h-8" /></div>
                            )}
                        </div>

                        {/* Name & Type */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base md:text-lg font-bold text-white truncate group-hover:text-blue-400 transition-colors leading-tight">{name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] md:text-xs uppercase tracking-widest text-zinc-500 font-bold">{type}</span>
                                <span className={`w-1.5 h-1.5 rounded-full ${isFunding ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'}`} />
                                <span className="text-[10px] text-zinc-600 font-medium hidden xs:inline">{isFunding ? 'Funding Phase' : 'Live Trading'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Desktop/Mobile Middle Section: Sparkline */}
                    <div className="flex items-center justify-between sm:justify-center px-2 sm:px-0">
                        {/* Price & Change (Mobile context inside middle section) */}
                        <div className="flex flex-col sm:hidden">
                            <span className="text-lg font-black text-white">${price.toFixed(2)}</span>
                            <span className={`flex items-center gap-0.5 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(change24h).toFixed(2)}%
                            </span>
                        </div>

                        <div className="flex-shrink-0">
                            <Sparkline data={priceHistory || []} positive={isPositive} />
                        </div>
                    </div>

                    {/* Stats Section: Price, Vol, Holders (Always visible) */}
                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 sm:border-l border-white/5 pt-3 sm:pt-0 sm:pl-6 min-w-fit">
                        {/* Price & Change (Desktop) */}
                        <div className="hidden sm:flex flex-col items-end min-w-[100px]">
                            <span className="text-xl font-black text-white tracking-tight">${price.toFixed(2)}</span>
                            <span className={`flex items-center gap-0.5 text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                {Math.abs(change24h).toFixed(2)}%
                            </span>
                        </div>

                        {/* Informational Stats */}
                        <div className="flex items-center gap-5">
                            <div className="flex flex-col items-center xs:items-start">
                                <span className="text-[9px] md:text-[10px] text-zinc-600 uppercase font-black tracking-tighter">Volume</span>
                                <span className="text-xs md:text-sm text-zinc-300 font-mono font-bold">{formatVolume(volume24h)}</span>
                            </div>
                            <div className="flex flex-col items-center xs:items-start">
                                <span className="text-[9px] md:text-[10px] text-zinc-600 uppercase font-black tracking-tighter">Holders</span>
                                <span className="text-xs md:text-sm text-zinc-300 font-mono font-bold">{holders}</span>
                            </div>
                            {isFunding && (
                                <div className="flex flex-col items-center xs:items-start">
                                    <span className="text-[9px] md:text-[10px] text-yellow-600/80 uppercase font-black tracking-tighter">Goal</span>
                                    <span className="text-xs md:text-sm text-yellow-500 font-mono font-bold">{fundingProgress?.toFixed(0)}%</span>
                                </div>
                            )}
                        </div>

                        {/* Bookmark - Always visible in list */}
                        <button
                            onClick={handleToggleBookmark}
                            className={`p-2.5 rounded-xl transition-all ${isBookmarked
                                ? 'text-blue-400 bg-blue-400/10'
                                : 'text-zinc-600 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                    </div>
                </Link>

                {/* Flying Tooltip (Mobile restricted handled in Portal) */}
                {isHovering && hasMouseMoved && (typeof window !== 'undefined' && window.innerWidth >= 768) && (typeof document !== 'undefined') && createPortal(
                    <div className="fixed z-[9999] pointer-events-none p-4 max-w-[280px] bg-zinc-950/95 backdrop-blur-xl border border-blue-500/30 rounded-xl shadow-2xl" style={tooltipStyle}>
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 animate-pulse" />
                            <div>
                                <span className="text-[10px] font-bold text-blue-400 uppercase block mb-1">Mega-AI Insight</span>
                                <p className="text-xs text-zinc-300 font-mono leading-relaxed">{displayedText}<span className="inline-block w-1.5 h-3 bg-blue-400 ml-0.5 animate-pulse" /></p>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </motion.div>
        );
    }

    // Default Grid View
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative group h-[160px] md:h-[185px]"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
        >
            {/* Bookmark Button */}
            <button
                type="button"
                onClick={handleToggleBookmark}
                className={`absolute top-3 right-3 z-20 p-1.5 rounded-full transition-all duration-200 ${isBookmarked
                    ? 'bg-blue-500/20 text-blue-400'
                    : isAuthenticated
                        ? 'text-zinc-600 hover:bg-white/5 hover:text-zinc-300'
                        : 'text-zinc-800 cursor-not-allowed'
                    }`}
                disabled={!isAuthenticated}
                title={isAuthenticated ? 'Toggle Bookmark' : 'Login to bookmark'}
            >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <Link
                href={`/assets/${id}`}
                className="block h-full bg-zinc-900/80 backdrop-blur-sm border border-white/5 rounded-xl p-3 md:p-4 flex flex-col justify-between hover:border-white/10 hover:bg-zinc-900 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/5"
            >
                {/* Header: Icon + Name */}
                <div className="flex items-start gap-2 md:gap-3">
                    {/* Asset Icon - Larger */}
                    <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-lg md:rounded-xl overflow-hidden bg-zinc-800/80 border border-white/5">
                        {!imgError && imageUrl ? (
                            <img
                                src={imageUrl}
                                alt={name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-zinc-500 group-hover:text-blue-400 transition-colors">
                                <Icon className="w-5 h-5 md:w-6 md:h-6" />
                            </div>
                        )}
                    </div>

                    {/* Name only */}
                    <div className="flex-1 min-w-0 pr-6 md:pr-8">
                        <h3 className="text-xs md:text-sm font-medium text-zinc-100 leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
                            {name}
                        </h3>
                    </div>
                </div>

                {/* Middle Row: Price + Change + Sparkline */}
                <div className="flex items-center justify-between mt-2 md:mt-3">
                    {/* Price & Change */}
                    <div className="flex flex-col md:flex-row md:items-baseline gap-0.5 md:gap-2">
                        <span className="text-sm md:text-lg font-semibold text-white tabular-nums">
                            ${price.toFixed(2)}
                        </span>
                        <span className={`flex items-center gap-0.5 text-[10px] md:text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? <ArrowUpRight className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                            {Math.abs(change24h).toFixed(2)}%
                        </span>
                    </div>

                    {/* Sparkline */}
                    <div className="flex-shrink-0">
                        <Sparkline data={priceHistory || []} positive={isPositive} />
                    </div>
                </div>

                {/* Footer: Stats Row with Labels + Status */}
                <div className="flex items-center justify-between mt-auto pt-1.5 md:pt-2">
                    <div className="flex items-center gap-1.5 md:gap-3 overflow-hidden">
                        <div className="flex items-center gap-0.5 md:gap-1 text-[8px] md:text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                            <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            <span className="hidden xs:inline text-zinc-600">Vol</span>
                            <span className="font-mono">{formatVolume(volume24h)}</span>
                        </div>
                        <div className="flex items-center gap-0.5 md:gap-1 text-[8px] md:text-[10px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                            <Users className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            <span className="hidden xs:inline text-zinc-600">Holders</span>
                            <span className="font-mono">{holders}</span>
                        </div>
                        {isFunding && fundingProgress !== undefined && (
                            <div className="flex items-center gap-1 text-[10px] text-yellow-500/80">
                                <Activity className="w-3 h-3" />
                                <span className="text-yellow-600/60">Cap</span>
                                <span className="font-mono">{fundingProgress.toFixed(0)}%</span>
                            </div>
                        )}
                    </div>

                    {/* Status indicator - Bottom Right */}
                    <div className="flex items-center gap-1 md:gap-1.5">
                        <span
                            className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${isFunding
                                ? 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                                : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                                }`}
                            style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
                        />
                        <span className={`text-[8px] md:text-[10px] font-medium ${isFunding ? 'text-yellow-400' : 'text-emerald-400'}`}>
                            {isFunding ? 'Funding' : 'Live'}
                        </span>
                    </div>
                </div>
            </Link>

            {/* Flying Tooltip */}
            {
                isHovering && hasMouseMoved && (typeof window !== 'undefined' && window.innerWidth >= 768) && (typeof document !== 'undefined') && createPortal(
                    <div
                        className="fixed z-[9999] pointer-events-none p-4 max-w-[280px] bg-zinc-950/95 backdrop-blur-xl border border-blue-500/30 rounded-xl shadow-2xl shadow-blue-500/10 animate-in fade-in zoom-in-95 duration-150"
                        style={tooltipStyle}
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                            <div>
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1 block">Mega-AI Insight</span>
                                <p className="text-xs text-zinc-300 font-mono leading-relaxed">
                                    {displayedText}
                                    <span className="inline-block w-1.5 h-3 bg-blue-400 ml-0.5 animate-pulse align-middle" />
                                </p>
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }
        </motion.div >
    );
}
