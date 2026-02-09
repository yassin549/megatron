'use client';

import Link from 'next/link';
import { Bookmark, LayoutGrid, ArrowUpRight } from 'lucide-react';
import { SearchItemImage } from '../SearchItemImage';
import { Skeleton } from '@/components/ui/Skeleton';

interface Bookmark {
    id: string;
    name: string;
    imageUrl?: string;
    price: number;
    change24h: number;
}

interface BookmarksPanelProps {
    bookmarks: Bookmark[];
    loading: boolean;
    onClose: () => void;
}

export function BookmarksPanel({ bookmarks, loading, onClose }: BookmarksPanelProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                ))}
            </div>
        );
    }

    if (bookmarks.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6">
                    <Bookmark className="w-8 h-8 text-zinc-700" />
                </div>
                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No variables tracked</p>
                <p className="text-xs text-zinc-600 mt-2">Add markets to your watchlist to see them here.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 h-full">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Tracking Matrix</span>
                </div>
                <Link
                    href="/bookmarks"
                    onClick={onClose}
                    className="text-[10px] font-bold text-primary hover:text-white transition-colors uppercase tracking-widest flex items-center gap-1"
                >
                    Expand All <ArrowUpRight className="w-3 h-3" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bookmarks.slice(0, 8).map((bm) => (
                    <Link
                        key={bm.id}
                        href={`/assets/${bm.id}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-primary/30 hover:bg-white/[0.06] transition-all group relative overflow-hidden"
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            <SearchItemImage src={bm.imageUrl} alt={bm.name} />
                            <div>
                                <p className="text-sm font-extrabold text-white group-hover:text-primary transition-colors tracking-tight">{bm.name}</p>
                                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mt-1">${bm.price.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="text-right relative z-10">
                            <span className={`text-xs font-mono font-black ${bm.change24h >= 0 ? 'text-neon-emerald' : 'text-neon-rose'}`}>
                                {bm.change24h > 0 ? '+' : ''}{bm.change24h.toFixed(2)}%
                            </span>
                        </div>
                        {/* Subtle background glow on hover */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                ))}
            </div>

            {bookmarks.length > 8 && (
                <div className="mt-auto pt-6 border-t border-white/5 text-center">
                    <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest animate-pulse">
                        + {bookmarks.length - 8} additional sectors hidden
                    </p>
                </div>
            )}
        </div>
    );
}
