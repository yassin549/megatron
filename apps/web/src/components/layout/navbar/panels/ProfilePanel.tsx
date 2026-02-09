'use client';

import Link from 'next/link';
import { ChartBar, PieChart, Layers, Wallet, Trophy, Palette, LogOut, ArrowUpRight } from 'lucide-react';

interface ProfilePanelProps {
    onClose: () => void;
    userName?: string | null;
}

/**
 * Profile menu content with navigation grid, list links, and logout.
 */
export function ProfilePanel({ onClose, userName }: ProfilePanelProps) {
    return (
        <div className="flex flex-col h-full">
            {/* Navigation Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
                <Link href="/dashboard" onClick={onClose} className="group relative overflow-hidden rounded-2xl bg-card border border-border/40 p-3 transition-all hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] active:scale-[0.98]">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="relative z-10 flex flex-col gap-2">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all duration-200">
                            <ChartBar className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-foreground group-hover:text-blue-400 transition-colors">Dashboard</span>
                            <p className="text-[9px] text-muted-foreground group-hover:text-blue-400/80 transition-colors font-medium">Overview & Stats</p>
                        </div>
                    </div>
                </Link>

                <Link href="/portfolio" onClick={onClose} className="group relative overflow-hidden rounded-2xl bg-card border border-border/40 p-3 transition-all hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98]">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="relative z-10 flex flex-col gap-2">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-200">
                            <PieChart className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-foreground group-hover:text-emerald-400 transition-colors">Portfolio</span>
                            <p className="text-[9px] text-muted-foreground group-hover:text-emerald-400/80 transition-colors font-medium">Your Assets</p>
                        </div>
                    </div>
                </Link>

                <Link href="/lp" onClick={onClose} className="group relative overflow-hidden rounded-2xl bg-card border border-border/40 p-3 transition-all hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] active:scale-[0.98]">
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="relative z-10 flex flex-col gap-2">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all duration-200">
                            <Layers className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-foreground group-hover:text-purple-400 transition-colors">Pools</span>
                            <p className="text-[9px] text-muted-foreground group-hover:text-purple-400/80 transition-colors font-medium">Liquidity</p>
                        </div>
                    </div>
                </Link>

                <Link href="/wallet" onClick={onClose} className="group relative overflow-hidden rounded-2xl bg-card border border-border/40 p-3 transition-all hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] active:scale-[0.98]">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    <div className="relative z-10 flex flex-col gap-2">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-200">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-foreground group-hover:text-amber-400 transition-colors">Wallet</span>
                            <p className="text-[9px] text-muted-foreground group-hover:text-amber-400/80 transition-colors font-medium">Deposit/Withdraw</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* List Links */}
            <div className="space-y-1 mb-auto">
                <Link href="/leaderboard" onClick={onClose} className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-active transition-all active:scale-[0.99]">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-secondary/30 flex items-center justify-center text-amber-500/80 group-hover:text-amber-400 group-hover:bg-amber-500/10 transition-colors">
                            <Trophy className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Leaderboard</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transform duration-200" />
                </Link>

                <Link href="/settings" onClick={onClose} className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-active transition-all active:scale-[0.99]">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-secondary/30 flex items-center justify-center text-muted-foreground group-hover:text-foreground group-hover:bg-white/10 transition-colors">
                            <Palette className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Themes & Colors</span>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transform duration-200" />
                </Link>
            </div>

            {/* Footer Actions */}
            <div className="mt-4 pt-4 border-t border-border/40">
                <Link
                    href="/api/auth/signout"
                    className="group relative flex items-center justify-center gap-2.5 w-full py-3 rounded-xl bg-rose-500/10 text-rose-400 font-bold text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white hover:shadow-lg hover:shadow-rose-500/20 active:scale-[0.98] transition-all duration-200 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                    <LogOut className="w-3.5 h-3.5" />
                    Log Out Session
                </Link>
            </div>
        </div>
    );
}
