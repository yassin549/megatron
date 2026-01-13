'use client';

import { useEffect, useState } from 'react';
import { Trophy, Medal, TrendingUp, Shield } from 'lucide-react';

interface LeaderboardEntry {
    id: string;
    email: string;
    totalValue: number;
    totalDeposited: number;
    returnPercent: number;
}

export default function LeaderboardPage() {
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                const res = await fetch('/api/leaderboard');
                if (res.ok) {
                    const json = await res.json();
                    setData(json.leaderboard || []);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchLeaderboard();
    }, []);

    const maskEmail = (email: string) => {
        const parts = email.split('@');
        if (parts.length < 2) return 'Anonymous';
        return `${parts[0].slice(0, 3)}***@${parts[1]}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black">
                <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                    <div className="text-gray-500 font-mono animate-pulse">CALCULATING_RANKINGS...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-gray-200">

            <main className="max-w-5xl mx-auto px-4 py-12">
                <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
                    <h1 className="text-2xl md:text-4xl font-bold text-white mb-3 tracking-tight flex items-center justify-center gap-2 md:gap-3">
                        <Trophy className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />
                        Hall of Fame
                    </h1>
                    <p className="text-gray-400 text-sm md:text-lg px-4">
                        Top traders by percentage return on investment.
                    </p>
                </div>

                {/* Top 3 Cards */}
                {data.length >= 3 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                        {/* Gold (1st) - First on mobile */}
                        <div className="order-1 md:order-2 bg-gradient-to-b from-yellow-900/40 to-black border border-yellow-500 rounded-xl p-6 md:p-8 text-center md:-translate-y-4 hover:scale-105 transition-transform duration-300 shadow-2xl shadow-yellow-500/20 relative overflow-hidden">
                            <div className="absolute inset-0 bg-yellow-500/10 blur-xl"></div>
                            <div className="relative z-10">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-yellow-600/20 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border-2 border-yellow-500">
                                    <Trophy className="w-8 h-8 md:w-10 md:h-10 text-yellow-500" />
                                </div>
                                <h3 className="font-bold text-xl md:text-2xl text-white mb-1">{maskEmail(data[0].email)}</h3>
                                <p className="text-yellow-400 font-mono text-2xl md:text-3xl font-bold">
                                    +{data[0].returnPercent.toFixed(2)}%
                                </p>
                                <p className="text-[10px] md:text-xs text-yellow-500/70 mt-2 md:mt-3 font-mono">
                                    Vol: ${data[0].totalDeposited.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        {/* Silver (2nd) */}
                        <div className="order-2 md:order-1 bg-gradient-to-b from-gray-800 to-black border border-gray-600 rounded-xl p-4 md:p-6 text-center hover:scale-105 transition-transform duration-300 shadow-xl shadow-gray-500/10">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border-2 border-gray-400">
                                <span className="text-xl md:text-2xl font-bold text-gray-300">2</span>
                            </div>
                            <h3 className="font-bold text-white mb-1">{maskEmail(data[1].email)}</h3>
                            <p className="text-green-400 font-mono text-lg md:text-xl font-bold">
                                +{data[1].returnPercent.toFixed(2)}%
                            </p>
                            <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2 font-mono">
                                Vol: ${data[1].totalDeposited.toLocaleString()}
                            </p>
                        </div>

                        {/* Bronze (3rd) */}
                        <div className="order-3 bg-gradient-to-b from-orange-900/20 to-black border border-orange-700 rounded-xl p-4 md:p-6 text-center hover:scale-105 transition-transform duration-300 shadow-xl shadow-orange-500/10">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4 border-2 border-orange-600">
                                <span className="text-xl md:text-2xl font-bold text-orange-400">3</span>
                            </div>
                            <h3 className="font-bold text-white mb-1">{maskEmail(data[2].email)}</h3>
                            <p className="text-orange-400 font-mono text-lg md:text-xl font-bold">
                                +{data[2].returnPercent.toFixed(2)}%
                            </p>
                            <p className="text-[10px] md:text-xs text-gray-500 mt-1 md:mt-2 font-mono">
                                Vol: ${data[2].totalDeposited.toLocaleString()}
                            </p>
                        </div>
                    </div>
                )}

                {/* Leaderboard Table */}
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5 text-[10px] md:text-xs text-gray-400 uppercase tracking-wider font-mono">
                                <th className="px-3 md:px-6 py-3 md:py-4">Rank</th>
                                <th className="px-3 md:px-6 py-3 md:py-4">Trader</th>
                                <th className="hidden sm:table-cell px-6 py-4 text-right">Portfolio Value</th>
                                <th className="px-3 md:px-6 py-3 md:py-4 text-right">Return</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.map((entry, index) => (
                                <tr
                                    key={entry.id}
                                    className={`group hover:bg-white/5 transition-colors ${index < 3 ? 'bg-white/[0.02]' : ''}`}
                                >
                                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-mono text-gray-500">
                                        #{index + 1}
                                    </td>
                                    <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                                        <div className="max-w-[120px] md:max-w-none truncate">
                                            {maskEmail(entry.email)}
                                        </div>
                                    </td>
                                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right font-mono">
                                        ${entry.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className={`px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm font-bold text-right font-mono ${entry.returnPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {entry.returnPercent >= 0 ? '+' : ''}{entry.returnPercent.toFixed(2)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
