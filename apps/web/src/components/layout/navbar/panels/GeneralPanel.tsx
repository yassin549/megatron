'use client';

import Link from 'next/link';
import { TrendingUp, Users, LogOut, LayoutGrid, Zap, Globe, ShieldCheck } from 'lucide-react';

interface GeneralPanelProps {
    onClose: () => void;
}

export function GeneralPanel({ onClose }: GeneralPanelProps) {
    return (
        <div className="flex flex-col gap-10 h-full">
            {/* Main Navigation Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Link
                    href="/portfolio"
                    onClick={onClose}
                    className="group flex flex-col p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-primary/40 hover:bg-white/[0.06] transition-all relative overflow-hidden"
                >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-7 h-7" />
                    </div>
                    <h4 className="text-2xl font-black text-white mb-2 tracking-tighter">PORTFOLIO</h4>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Asset Management & Growth</p>
                    <div className="absolute top-4 right-4 text-primary opacity-20 group-hover:opacity-100 transition-opacity">
                        <Zap className="w-5 h-5 fill-current" />
                    </div>
                </Link>

                <Link
                    href="/leaderboard"
                    onClick={onClose}
                    className="group flex flex-col p-8 rounded-3xl bg-white/[0.03] border border-white/5 hover:border-amber-500/40 hover:bg-white/[0.06] transition-all relative overflow-hidden"
                >
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
                        <Users className="w-7 h-7" />
                    </div>
                    <h4 className="text-2xl font-black text-white mb-2 tracking-tighter">LEADERBOARD</h4>
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Commander Rankings</p>
                    <div className="absolute top-4 right-4 text-amber-500 opacity-20 group-hover:opacity-100 transition-opacity">
                        <Globe className="w-5 h-5" />
                    </div>
                </Link>
            </div>

            {/* Quick Access List */}
            <div className="flex flex-col gap-4">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                    <LayoutGrid className="w-3 h-3" /> System Access Points
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {['Markets', 'Trading', 'Vault', 'Neural Network', 'Documentation'].map((item) => (
                        <div key={item} className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs font-bold text-zinc-400 cursor-not-allowed flex items-center justify-between opacity-50">
                            {item.toUpperCase()}
                            <ShieldCheck className="w-3 h-3" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Logout Section */}
            <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-mono text-zinc-600">MEGATRON_TERMINAL_V1</p>
                    <p className="text-[10px] font-mono text-zinc-600">IP Override: Enabled</p>
                </div>
                <Link
                    href="/api/auth/signout"
                    className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-rose-500/10 text-rose-400 font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/10 active:scale-95"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </Link>
            </div>
        </div>
    );
}
