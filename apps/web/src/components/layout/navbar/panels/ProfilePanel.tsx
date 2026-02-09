'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ChartBar,
    PieChart,
    Layers,
    Wallet,
    Trophy,
    Palette,
    LogOut,
    ArrowUpRight,
    TrendingUp,
    Shield,
    Activity
} from 'lucide-react';

interface ProfilePanelProps {
    onClose: () => void;
    userName?: string | null;
}

export function ProfilePanel({ onClose, userName }: ProfilePanelProps) {
    const [stats, setStats] = useState({
        portfolioValue: '0.00',
        walletBalance: '0.00',
        isLoading: true
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/user/me');
                if (res.ok) {
                    const data = await res.json();
                    setStats({
                        portfolioValue: data.portfolioValue || '0.00',
                        walletBalance: data.walletHotBalance || '0.00',
                        isLoading: false
                    });
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
                setStats(prev => ({ ...prev, isLoading: false }));
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="flex flex-col gap-8 h-full">
            {/* Top Row: User Identity & Major Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 flex flex-col gap-4 p-6 rounded-2xl bg-white/[0.03] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Shield className="w-24 h-24 text-primary" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Authorization Tier</p>
                        <h4 className="text-xl font-bold text-white mb-4">COMMANDER LEVEL 1</h4>

                        <div className="flex items-end gap-8">
                            <div>
                                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1">Total Assets</p>
                                <p className="text-4xl font-black text-white tracking-tighter">
                                    ${parseFloat(stats.portfolioValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="pb-1">
                                <div className="flex items-center gap-2 text-neon-emerald font-mono text-xs">
                                    <TrendingUp className="w-3 h-3" />
                                    +12.4% (24h)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 p-6 rounded-2xl bg-primary/10 border border-primary/20 relative overflow-hidden group hover:bg-primary/20 transition-all cursor-default">
                    <div className="relative z-10">
                        <p className="text-[10px] font-mono text-primary uppercase tracking-widest mb-1">Available Liquidity</p>
                        <p className="text-3xl font-black text-white tracking-tighter mb-4">
                            ${parseFloat(stats.walletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <Link
                            href="/wallet"
                            onClick={onClose}
                            className="inline-flex items-center gap-2 text-[10px] font-bold text-primary hover:text-white transition-colors uppercase tracking-widest"
                        >
                            Refill Credits <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>
                    <div className="absolute -bottom-4 -right-4 opacity-10">
                        <Wallet className="w-24 h-24 text-primary" />
                    </div>
                </div>
            </div>

            {/* Middle Row: Navigation Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Dashboard', desc: 'Neural Center', icon: ChartBar, color: 'blue', href: '/dashboard' },
                    { label: 'Portfolio', desc: 'Asset Matrix', icon: PieChart, color: 'emerald', href: '/portfolio' },
                    { label: 'Liquidity', desc: 'Pool Sectors', icon: Layers, color: 'purple', href: '/lp' },
                    { label: 'Leaderboard', desc: 'Rankings', icon: Trophy, color: 'amber', href: '/leaderboard' },
                ].map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={onClose}
                        className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/20 transition-all hover:bg-white/[0.05]"
                    >
                        <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/10 flex items-center justify-center text-${item.color}-500 mb-4 group-hover:scale-110 transition-transform`}>
                            <item.icon className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-white mb-1 tracking-tight">{item.label}</p>
                        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{item.desc}</p>
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Bottom Row: Utility & Activity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-auto">
                <div className="md:col-span-2 flex flex-col gap-4">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Recent Activity</p>
                    <div className="space-y-2">
                        {[1, 2].map((i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                        <Activity className="w-4 h-4 text-zinc-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">System sync complete</p>
                                        <p className="text-[10px] text-zinc-500">Neural network stabilized in Sector {i}</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-600">04m AGO</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Core Utils</p>
                    <Link href="/settings" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
                        <Palette className="w-4 h-4 text-zinc-400 group-hover:text-primary" />
                        <span className="text-xs font-bold text-zinc-300 group-hover:text-white">Customization</span>
                    </Link>
                    <Link href="/api/auth/signout" className="flex items-center gap-3 p-3 rounded-xl hover:bg-rose-500/10 transition-colors border border-transparent hover:border-rose-500/10 group">
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span className="text-xs font-bold text-rose-400">Terminate Session</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
