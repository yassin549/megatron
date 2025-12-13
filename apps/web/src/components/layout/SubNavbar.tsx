'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    LayoutGrid,
    Users,
    Trophy,
    LineChart,
    CloudSun,
    Bitcoin,
    Vote,
    Microscope,
} from 'lucide-react';

const CATEGORIES = [
    { id: 'all', name: 'All', icon: LayoutGrid },
    { id: 'social', name: 'Social', icon: Users },
    { id: 'sports', name: 'Sports', icon: Trophy },
    { id: 'economics', name: 'Economics', icon: LineChart },
    { id: 'weather', name: 'Weather', icon: CloudSun },
    { id: 'crypto', name: 'Crypto', icon: Bitcoin },
    { id: 'politics', name: 'Politics', icon: Vote },
    { id: 'science', name: 'Science', icon: Microscope },
];

export function SubNavbar() {
    const searchParams = useSearchParams();
    const currentCategory = searchParams.get('category') || 'all';
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to active category
    useEffect(() => {
        if (scrollRef.current) {
            const activeElement = scrollRef.current.querySelector('[data-active="true"]');
            if (activeElement) {
                activeElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center',
                });
            }
        }
    }, [currentCategory]);

    return (
        <div className="border-b border-white/5 bg-background/80 backdrop-blur-md sticky top-16 z-40 transition-all duration-300">
            <div className="max-w-[1400px] mx-auto px-4">
                <div
                    ref={scrollRef}
                    className="relative flex items-center justify-center gap-10 overflow-x-auto no-scrollbar py-0 mask-fade-right h-14"
                >
                    {CATEGORIES.map((category) => {
                        const isActive = currentCategory === category.id;
                        return (
                            <Link
                                key={category.id}
                                href={`/?category=${category.id}`}
                                data-active={isActive}
                                className={`flex items-center gap-2 px-6 py-4 border-b-[3px] transition-all duration-200 text-sm font-medium whitespace-nowrap ${isActive
                                        ? 'border-blue-500 text-white shadow-[0_4px_12px_-2px_rgba(59,130,246,0.5)]'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-700'
                                    }`}
                            >
                                {category.name}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
