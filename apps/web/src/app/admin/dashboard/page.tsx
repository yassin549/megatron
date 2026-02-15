'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Users,
    BarChart3,
    Activity,
    Database,
    Zap,
    Server,
    ChevronRight,
    ExternalLink,
    LayoutDashboard,
    Database as DatabaseIcon,
    Loader2
} from 'lucide-react';

export default function AdminDashboardPage() {
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [usersCount, setUsersCount] = useState<number | null>(null);

    const [stats, setStats] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await fetch('/api/user/me');
                if (!res.ok) {
                    router.push('/login');
                    return;
                }
                const data = await res.json();
                if (!data?.isAdmin) {
                    router.push('/login');
                    return;
                }
                if (active) {
                    fetchDashboardData();
                }
            } catch {
                router.push('/login');
            }
        })();

        // Refresh every 30 seconds
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, [router]);

    const fetchDashboardData = async () => {
        try {
            setError(null);
            const res = await fetch('/api/admin/stats');

            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setHealth(data.health);
            } else {
                if (res.status === 401) {
                    router.push('/login');
                } else {
                    const data = await res.json().catch(() => ({}));
                    setError(data.error || `Server Error (${res.status})`);
                }
            }
        } catch (err: any) {
            console.error('Failed to fetch dashboard data:', err);
            setError(err.message || 'Connection failed');
        } finally {
            setLoading(false);
        }
    };



    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading dashboard...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground tracking-tight antialiased">


            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {error && (
                    <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3 text-red-500">
                            <Activity className="w-5 h-5" />
                            <span className="font-medium">Failed to fetch live stats: {error}</span>
                        </div>
                        <button
                            onClick={() => { setLoading(true); fetchDashboardData(); }}
                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 text-xs font-bold rounded-lg transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group">
                        <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                            Total Users
                        </p>
                        {loading ? (
                            <div className="h-9 w-24 bg-white/5 animate-pulse rounded mt-1" />
                        ) : (
                            <p className="text-3xl font-bold mt-1">
                                {stats?.totalUsers ?? '-'}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${stats ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                            Live from database
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group">
                        <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                            Assets
                        </p>
                        {loading ? (
                            <div className="h-9 w-16 bg-white/5 animate-pulse rounded mt-1" />
                        ) : (
                            <p className="text-3xl font-bold mt-1">
                                {stats?.activeAssets ?? '-'} <span className="text-sm font-normal text-muted-foreground">/ {stats?.totalAssets ?? '-'}</span>
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            {stats?.activeAssets ?? '0'} active markets out of {stats?.totalAssets ?? '0'} total
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group">
                        <p className="text-sm text-zinc-500 font-mono uppercase tracking-widest group-hover:text-primary transition-colors">
                            Total Volume (24h)
                        </p>
                        {loading ? (
                            <div className="h-9 w-32 bg-white/5 animate-pulse rounded mt-1" />
                        ) : (
                            <p className="text-3xl font-bold mt-1 text-white">
                                {stats?.totalVolume24h !== undefined ? `$${stats.totalVolume24h.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            Global trade volume
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group">
                        <p className="text-sm text-zinc-500 font-mono uppercase tracking-widest group-hover:text-primary transition-colors">
                            Platform Revenue
                        </p>
                        {loading ? (
                            <div className="h-9 w-32 bg-white/5 animate-pulse rounded mt-1" />
                        ) : (
                            <p className="text-3xl font-bold mt-1 text-neon-emerald">
                                {stats?.treasuryBalance !== undefined ? `$${stats.treasuryBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </p>
                        )}
                        <div className="flex justify-between items-center mt-2 group-hover:text-primary transition-colors">
                            <p className="text-xs text-muted-foreground">
                                Total Fees Generated:
                            </p>
                            <p className="text-xs font-bold">
                                {stats?.allTimeFees !== undefined ? `$${stats.allTimeFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Admin Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Management */}
                    <div className="bg-card border border-border rounded-xl p-8 flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-500" />
                            </div>
                            <h2 className="text-xl font-bold">User Management</h2>
                        </div>
                        <div className="space-y-4 flex-1">
                            <Link
                                href="/admin/users"
                                className="flex items-center justify-between p-4 bg-secondary/50 border border-border rounded-xl hover:bg-secondary hover:border-primary/30 transition-all text-left group"
                            >
                                <div>
                                    <p className="font-bold text-foreground">View All Users & Email Control</p>
                                    <p className="text-sm text-muted-foreground">Manage accounts, broadcast announcements, and check balances.</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Link>
                            <Link
                                href="/admin/users"
                                className="flex items-center justify-between p-4 bg-secondary/50 border border-border rounded-xl hover:bg-secondary hover:border-primary/30 transition-all text-left group"
                            >
                                <div>
                                    <p className="font-bold text-foreground">Blacklist & Status Management</p>
                                    <p className="text-sm text-muted-foreground">Enforce platform security and manage user restrictions.</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Link>
                        </div>
                    </div>

                    {/* Asset Management */}
                    <div className="bg-card border border-border rounded-xl p-8 flex flex-col">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <BarChart3 className="w-5 h-5 text-purple-500" />
                            </div>
                            <h2 className="text-xl font-bold">Asset Management</h2>
                        </div>
                        <div className="space-y-4 flex-1">
                            <Link
                                href="/admin/requests"
                                className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/20 transition-all text-left group"
                            >
                                <div>
                                    <p className="font-bold text-primary">Review Feedback</p>
                                    <p className="text-sm text-muted-foreground">Approve or reject community feedback and new markets.</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-primary" />
                            </Link>
                            <Link
                                href="/admin/assets"
                                className="flex items-center justify-between p-4 bg-secondary/50 border border-border rounded-xl hover:bg-secondary hover:border-primary/30 transition-all text-left group"
                            >
                                <div>
                                    <p className="font-bold text-foreground">Manage Assets (Create/Delete)</p>
                                    <p className="text-sm text-muted-foreground">Directly modify markets, update pricing, or resolve outcomes.</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </Link>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-card border border-border rounded-xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center">
                                <Activity className="w-5 h-5 text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold">System Health</h2>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Database className="w-4 h-4" /> Database
                                </span>
                                <span className={`font-bold flex items-center gap-1.5 ${health?.database === 'Connected' ? 'text-green-500' : 'text-red-500'}`}>
                                    <span className="w-2 h-2 rounded-full bg-current" />
                                    {health?.database || 'Checking...'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-border">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> Redis Cache
                                </span>
                                <span className={`font-bold flex items-center gap-1.5 ${health?.redis === 'Connected' ? 'text-green-500' : 'text-red-500'}`}>
                                    <span className="w-2 h-2 rounded-full bg-current" />
                                    {health?.redis || 'Checking...'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-3">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Server className="w-4 h-4" /> Worker Engine
                                </span>
                                <span className={`font-bold flex items-center gap-1.5 ${health?.worker === 'Active' ? 'text-green-500' : 'text-zinc-500'}`}>
                                    <span className="w-2 h-2 rounded-full bg-current" />
                                    {health?.worker || 'Checking...'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access */}
                    <div className="bg-card border border-border rounded-xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-zinc-500/10 rounded-lg flex items-center justify-center">
                                <ExternalLink className="w-5 h-5 text-zinc-400" />
                            </div>
                            <h2 className="text-xl font-bold">Platform Quick Links</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Link
                                href="/dashboard"
                                className="flex flex-col items-center gap-2 p-4 bg-secondary/50 border border-border rounded-xl hover:bg-secondary hover:border-primary/30 transition-all text-center"
                            >
                                <LayoutDashboard className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm font-bold">User View</span>
                            </Link>
                            <a
                                href="https://console.neon.tech"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 p-4 bg-secondary/50 border border-border rounded-xl hover:bg-secondary hover:border-primary/30 transition-all text-center"
                            >
                                <DatabaseIcon className="w-6 h-6 text-muted-foreground" />
                                <span className="text-sm font-bold">Neon SQL</span>
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

