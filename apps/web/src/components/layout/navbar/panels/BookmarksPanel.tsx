'use client';

import Link from 'next/link';
import { Bookmark } from 'lucide-react';
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

/**
 * Bookmarks panel showing saved markets with loading and empty states.
 */
export function BookmarksPanel({ bookmarks, loading, onClose }: BookmarksPanelProps) {
    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 rounded-2xl" />
                ))}
            </div>
        );
    }

    if (bookmarks.length === 0) {
        return (
            <div className="py-20 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Bookmark className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-500">No bookmarked markets</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-2">
                {bookmarks.slice(0, 6).map((bm) => (
                    <Link
                        key={bm.id}
                        href={`/assets/${bm.id}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-3 rounded-2xl bg-surface border border-border/5 hover:bg-active hover:border-white/10 transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <SearchItemImage src={bm.imageUrl} alt={bm.name} />
                            <div>
                                <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">{bm.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-0.5">${bm.price.toFixed(2)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`text-xs font-mono font-black ${bm.change24h >= 0 ? 'text-neon-emerald' : 'text-neon-rose'}`}>
                                {bm.change24h > 0 ? '+' : ''}{bm.change24h.toFixed(2)}%
                            </span>
                        </div>
                    </Link>
                ))}
                <Link
                    href="/bookmarks"
                    onClick={onClose}
                    className="block w-full text-center py-2 text-xs font-bold text-primary hover:text-white transition-colors uppercase tracking-widest mt-2"
                >
                    View all {bookmarks.length} Bookmarks
                </Link>
            </div>
        </div>
    );
}
