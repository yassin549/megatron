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
    Bookmark
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
    isAuthenticated
}: AssetCardProps) {
    const isPositive = change24h >= 0;
    const Icon = TYPE_ICONS[type] || LayoutGrid;
    const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked || false);

    // Sync with prop if it changes (e.g. re-fetch)
    useEffect(() => {
        if (typeof initialIsBookmarked === 'boolean') {
            setIsBookmarked(initialIsBookmarked);
        }
    }, [initialIsBookmarked]);

    const handleToggleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) return; // Prevent action if not logged in

        // Optimistic UI Update
        const newState = !isBookmarked;
        setIsBookmarked(newState);

        try {
            const res = await fetch('/api/bookmarks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetId: id })
            });

            if (!res.ok) {
                // Revert on error
                setIsBookmarked(!newState);
            }
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
            setIsBookmarked(!newState);
        }
    };

    // Format Volume
    const formatVolume = (vol: number) => {
        if (vol >= 1000000) return `$${(vol / 1000000).toFixed(1)}m Vol.`;
        if (vol >= 1000) return `$${(vol / 1000).toFixed(1)}k Vol.`;
        return `$${vol} Vol.`;
    };

    // Mouse Tracking for Tooltip
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const typingInterval = useRef<NodeJS.Timeout | null>(null);
    const [error, setError] = useState(false);

    // Typing Logic
    // Fix: Show static description (what the asset measures) first, AI summary as fallback
    const rawDescription = description || aiSummary || "AI analysis pending for this asset...";
    // Robust removal of "undefined" using split/join to capture all instances safely
    const fullDescription = rawDescription.split('undefined').join('').trim();

    useEffect(() => {
        if (isHovering) {
            let currentIndex = 0;
            // Clear text on re-hover to restart typing
            setDisplayedText('');
            if (typingInterval.current) clearInterval(typingInterval.current);

            typingInterval.current = setInterval(() => {
                if (currentIndex < fullDescription.length) {
                    const char = fullDescription[currentIndex];
                    if (char) {
                        setDisplayedText(prev => prev + char);
                    }
                    currentIndex++;
                } else {
                    if (typingInterval.current) clearInterval(typingInterval.current);
                }
            }, 10);
        } else {
            setDisplayedText('');
            if (typingInterval.current) clearInterval(typingInterval.current);
        }
        return () => {
            if (typingInterval.current) clearInterval(typingInterval.current);
        };
    }, [isHovering, fullDescription]);

    const handleMouseMove = (e: React.MouseEvent) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    // Calculate tooltip position (flip if near bottom or right)
    // We use a safe default if window isn't defined (SSR)
    const isNearBottom = typeof window !== 'undefined' && mousePos.y > window.innerHeight - 220;
    const isNearRight = typeof window !== 'undefined' && mousePos.x > window.innerWidth - 320;

    // Check if mouse hasn't moved yet (0,0) to prevent top-left glitch
    const hasMouseMoved = mousePos.x !== 0 || mousePos.y !== 0;

    const tooltipStyle: React.CSSProperties = {
        left: isNearRight ? `${mousePos.x - 290}px` : `${mousePos.x + 16}px`,
        top: isNearBottom ? `${mousePos.y - 140}px` : `${mousePos.y + 16}px`
    };

    // Pricing Logic
    const isFunding = status?.toLowerCase() === 'funding';
    // During funding, price starts at P0 (or actual price from DB)
    const displayPrice = price;
    const displayChange = change24h;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative group h-[170px] md:h-[185px]"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onMouseMove={handleMouseMove}
        >
            {/* Bookmark Button (Outside Link for valid HTML & Events) */}
            <button
                type="button"
                onClick={handleToggleBookmark}
                className={`absolute top-4 right-4 z-20 p-1.5 rounded-full transition-all duration-200 ${isBookmarked
                    ? 'bg-blue-500/10 text-blue-400'
                    : isAuthenticated ? 'text-zinc-600 hover:bg-white/5 hover:text-zinc-300' : 'text-zinc-800 cursor-not-allowed'
                    }`}
                disabled={!isAuthenticated}
                title={isAuthenticated ? 'Toggle Bookmark' : 'Login to bookmark'}
            >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <Link
                href={`/assets/${id}`}
                className="block h-full glass-card rounded-xl p-3.5 md:p-5 flex flex-col justify-between hover:scale-[1.02] transform"
            >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                    {/* Left: Image & Title */}
                    <div className="flex items-center gap-2.5 md:gap-3 overflow-hidden pr-6 md:pr-8">
                        <div className="relative w-8 h-8 md:w-10 md:h-10 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800 border border-white/5 shadow-inner">
                            {!error && imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={imageUrl}
                                    alt={name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    onError={() => setError(true)}
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-600 group-hover:text-blue-400 transition-colors">
                                    <Icon className="w-4 h-4 md:w-5 md:h-5" />
                                </div>
                            )}
                        </div>
                        <h3 className="text-[13px] md:text-sm font-semibold text-zinc-100 leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
                            {name}
                        </h3>
                    </div>
                </div>

                {/* Data Row */}
                <div className="grid grid-cols-2 gap-2 mt-1.5 md:mt-2">
                    {/* Price Box */}
                    <div className="bg-black/20 rounded-lg md:rounded-xl px-2 py-1 md:px-3 md:py-2 border border-white/5 group-hover:border-white/10 transition-colors">
                        <span className="block text-[8px] md:text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-0.5">Price</span>
                        <div className="text-[11px] md:text-sm font-bold text-zinc-100 tabular-nums">
                            ${displayPrice.toFixed(2)}
                            {isFunding && <span className="text-[9px] ml-1 text-yellow-500 font-normal">{(fundingProgress || 0).toFixed(0)}%</span>}
                        </div>
                    </div>
                    {/* Change Box */}
                    <div className="bg-black/20 rounded-lg md:rounded-xl px-2 py-1 md:px-3 md:py-2 border border-white/5 group-hover:border-white/10 transition-colors">
                        <span className="block text-[8px] md:text-[10px] uppercase tracking-wider text-zinc-500 font-medium mb-0.5">24h Change</span>
                        <div className={`text-[11px] md:text-sm font-bold tabular-nums flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPositive ? <ArrowUpRight className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <ArrowDownRight className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                            {Math.abs(displayChange).toFixed(2)}%
                        </div>
                    </div>
                </div>

                {/* Footer: Volume & AI Badge */}
                <div className="flex items-center justify-between pt-2 mt-auto">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                        <Activity className="w-3 h-3" />
                        <span className="font-mono">{formatVolume(volume24h)}</span>
                    </div>

                    <div className="flex items-center gap-1.5 md:gap-2">
                        {/* Status Tag */}
                        {isFunding ? (
                            <div className="px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[8px] md:text-[10px] font-medium text-yellow-500 opacity-80 group-hover:opacity-100 transition-opacity">
                                Funding
                            </div>
                        ) : (
                            <div className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] md:text-[10px] font-medium text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity">
                                Live
                            </div>
                        )}

                        {/* AI Tag - Hidden on very small mobile if space is tight */}
                        <div className="hidden xs:block px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[8px] md:text-[10px] font-medium text-blue-400 opacity-60 group-hover:opacity-100 transition-opacity">
                            AI Analysis
                        </div>
                    </div>
                </div>
            </Link>

            {/* Flying Tooltip - Portalled to body to escape parent transforms */}
            {isHovering && hasMouseMoved && (typeof window !== 'undefined' && window.innerWidth >= 768) && (typeof document !== 'undefined') && createPortal(
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
            )}
        </motion.div>
    );
}
