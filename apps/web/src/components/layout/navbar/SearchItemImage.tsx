'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FileText } from 'lucide-react';

interface SearchItemImageProps {
    src?: string;
    alt: string;
}

/**
 * Robust image component for search results with Next/Image and standard img fallbacks.
 */
export function SearchItemImage({ src, alt }: SearchItemImageProps) {
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
