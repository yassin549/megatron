'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface AssetHoverCardProps {
    assetId: string;
    assetName: string;
    children: React.ReactNode;
}

interface AssetPreview {
    description: string | null;
    type: string;
    status: string;
    price: number;
    change24h: number;
    liquidity: number;
    fundingProgress: number;
}

export function AssetHoverCard({ assetId, assetName, children }: AssetHoverCardProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [preview, setPreview] = useState<AssetPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const fetchPreview = async () => {
        if (preview) return; // Already loaded
        setLoading(true);
        try {
            const res = await fetch(`/api/assets/${assetId}`);
            if (res.ok) {
                const data = await res.json();
                setPreview({
                    description: data.asset.description,
                    type: data.asset.type,
                    status: data.asset.status,
                    price: data.asset.price,
                    change24h: data.asset.change24h,
                    liquidity: data.asset.liquidity,
                    fundingProgress: data.asset.fundingProgress,
                });
            }
        } catch (error) {
            console.error('Failed to fetch asset preview:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMouseEnter = () => {
        timeoutRef.current = setTimeout(() => {
            setIsOpen(true);
            fetchPreview();
        }, 300); // 300ms delay before showing
    };

    const handleMouseLeave = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsOpen(false);
    };

    return (
        <div
            className="relative inline-block"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}

            {isOpen && (
                <div
                    ref={cardRef}
                    className="absolute z-50 left-0 top-full mt-2 w-72 bg-card border border-border rounded-xl p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div>
                                <h4 className="font-semibold text-foreground text-sm">
                                    {assetName}
                                </h4>
                                {preview && (
                                    <span className="text-xs text-muted-foreground capitalize">
                                        {preview.type}
                                    </span>
                                )}
                            </div>
                            {preview && (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${preview.status === 'active'
                                            ? 'bg-green-500/10 text-green-500'
                                            : preview.status === 'funding'
                                                ? 'bg-yellow-500/10 text-yellow-500'
                                                : 'bg-muted text-muted-foreground'
                                        }`}
                                >
                                    {preview.status}
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : preview ? (
                            <>
                                {/* Description */}
                                {preview.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                        {preview.description}
                                    </p>
                                )}

                                {/* Price info */}
                                <div className="flex items-end justify-between">
                                    <span className="text-lg font-bold text-foreground">
                                        ${preview.price.toFixed(2)}
                                    </span>
                                    <span
                                        className={`text-sm font-medium ${preview.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                                            }`}
                                    >
                                        {preview.change24h >= 0 ? '+' : ''}
                                        {preview.change24h.toFixed(2)}%
                                    </span>
                                </div>

                                {/* Funding progress for funding assets */}
                                {preview.status === 'funding' && (
                                    <div>
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-muted-foreground">Funding</span>
                                            <span className="text-yellow-500">
                                                {preview.fundingProgress.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-yellow-500 rounded-full"
                                                style={{ width: `${Math.min(100, preview.fundingProgress)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Liquidity */}
                                <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Liquidity</span>
                                    <span className="text-foreground">
                                        ${preview.liquidity.toLocaleString()}
                                    </span>
                                </div>

                                {/* CTA */}
                                <Link
                                    href={`/assets/${assetId}`}
                                    className="block w-full py-2 text-center text-xs bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                    View Details →
                                </Link>
                            </>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
