'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Wallet, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

export function MobileBottomNav() {
    const pathname = usePathname();

    const tabs = [
        { name: 'Assets', href: '/', icon: Home },
        { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
        { name: 'Wallet', href: '/wallet', icon: Wallet },
        { name: 'LP Pools', href: '/lp', icon: Layers }, // Using Layers for LP
    ];

    // Hide on login/signup pages
    if (pathname.includes('/login') || pathname.includes('/signup')) {
        return null;
    }

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 pb-8 pt-2 pointer-events-none">
            <nav className="glass-nav rounded-[24px] flex items-center justify-around p-2 shadow-[0_20px_50px_rgba(0,0,0,0.5)] pointer-events-auto bg-obsidian-900/60 backdrop-blur-xl border border-white/10">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 w-16 group active:scale-90 ${isActive ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-indicator"
                                    className="absolute inset-0 bg-primary/10 rounded-2xl"
                                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                                />
                            )}
                            <Icon className={`w-5 h-5 mb-1 z-10 transition-transform ${isActive ? 'stroke-[2.5px] scale-110 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'stroke-2 group-hover:scale-110'}`} />
                            <span className="text-[9px] font-bold z-10 uppercase tracking-tighter">{tab.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
