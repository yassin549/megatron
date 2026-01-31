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
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            <nav className="flex items-center justify-around p-2 pb-8 pointer-events-auto bg-black/80 backdrop-blur-2xl border-t border-white/10 rounded-t-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
                    const Icon = tab.icon;

                    return (
                        <Link
                            key={tab.name}
                            href={tab.href}
                            className={`relative flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300 w-16 group ${isActive ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="nav-indicator"
                                    className="absolute inset-0 bg-primary/10 rounded-2xl border border-primary/20"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <Icon className={`w-5 h-5 mb-1.5 z-10 transition-transform duration-300 ${isActive ? 'scale-110 stroke-[2.5px] drop-shadow-[0_0_12px_rgba(59,130,246,0.8)]' : 'stroke-2 group-hover:scale-110'}`} />
                            <span className="text-[9px] font-black uppercase tracking-wider z-10 leading-none">{tab.name}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
