'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, FileText } from 'lucide-react';
import Image from 'next/image';

// Robust image component for search results - kept local as it was in Navbar
function SearchItemImage({ src, alt }: { src?: string; alt: string }) {
    const [imageError, setImageError] = useState(false);
    const [useStandardImg, setUseStandardImg] = useState(false);

    if (!src || imageError) {
        return (
            <div className="w-10 h-10 rounded-lg bg-obsidian-900 border border-white/10 flex items-center justify-center text-zinc-600">
                <FileText className="w-5 h-5" />
            </div>
        );
    }

    return (
        <div className="w-10 h-10 rounded-lg bg-obsidian-900 border border-white/10 flex items-center justify-center overflow-hidden relative">
            {/* Fallback Icon underneath */}
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                <FileText className="w-5 h-5" />
            </div>

            {!useStandardImg ? (
                <Image
                    src={src}
                    alt={alt}
                    fill
                    className="object-cover relative z-10"
                    sizes="40px"
                    unoptimized={src.startsWith('/') || src.startsWith('http')}
                    onError={() => setUseStandardImg(true)}
                />
            ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={src}
                    alt={alt}
                    className="object-cover w-full h-full relative z-10"
                    onError={() => setImageError(true)}
                />
            )}
        </div>
    );
}

export function NavbarSearch() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Close on route change
    useEffect(() => {
        setIsSearchFocused(false);
    }, [router]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Element;
            if (!target.closest('.search-container')) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Debounced Search
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/assets?q=${encodeURIComponent(searchQuery)}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.assets || []);
                }
            } catch (error) {
                console.error('Search failed:', error);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/?q=${encodeURIComponent(searchQuery)}`);
            setIsSearchFocused(false);
        }
    };

    return (
        <div className="relative w-full group search-container">
            <form onSubmit={handleSearch} className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setIsSearchFocused(true)}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type / to search markets..."
                    className="block w-full pl-10 pr-3 py-2 bg-obsidian-900/50 border border-white/10 text-foreground placeholder-muted-foreground rounded-lg focus:outline-none focus:bg-obsidian-800 focus:ring-1 focus:ring-primary focus:border-primary/50 text-sm transition-all duration-200"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 border border-white/10 rounded text-[10px] font-mono text-muted-foreground">
                        /
                    </kbd>
                </div>
            </form>

            {/* Search Results Dropdown */}
            <AnimatePresence>
                {isSearchFocused && searchQuery.trim() && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-obsidian-950 overflow-hidden z-50 shadow-2xl border border-white/10"
                    >
                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                            {isSearching ? (
                                <div className="p-8 text-center">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <p className="text-xs text-muted-foreground">Searching cosmic variables...</p>
                                </div>
                            ) : searchResults.length > 0 ? (
                                <div className="p-2 space-y-1">
                                    {searchResults.map((asset) => (
                                        <Link
                                            key={asset.id}
                                            href={`/assets/${asset.id}`}
                                            onClick={() => setIsSearchFocused(false)}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-all group border border-transparent hover:border-white/5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <SearchItemImage src={asset.imageUrl} alt={asset.name} />
                                                <div>
                                                    <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                                                        {asset.name}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                                                        {asset.type}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-white font-mono">${asset.price.toFixed(2)}</p>
                                                <p className={`text-[10px] font-bold font-mono ${asset.change24h >= 0 ? 'text-neon-emerald' : 'text-neon-rose'}`}>
                                                    {asset.change24h > 0 ? '+' : ''}{asset.change24h}%
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center text-muted-foreground">
                                    <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No variables found matching &quot;{searchQuery}&quot;</p>
                                </div>
                            )}
                        </div>
                        <div className="p-3 bg-white/[0.02] border-t border-white/5 text-center">
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                                Press Enter to see all results
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
