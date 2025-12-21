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
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const [usersCount, setUsersCount] = useState<number | null>(null);

    const [stats, setStats] = useState<any>(null);
    const [health, setHealth] = useState<any>(null);

    useEffect(() => {
        const adminSession = localStorage.getItem('megatron_admin');
        if (adminSession !== 'true') {
            router.push('/admin/login');
            return;
        }
        setIsAdmin(true);
        fetchDashboardData();

        // Refresh every 30 seconds
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, [router]);

    const fetchDashboardData = async () => {
        try {
            const res = await fetch('/api/admin/stats');
            if (res.ok) {
                const data = await res.json();
                setStats(data.stats);
                setHealth(data.health);
            } else if (res.status === 401) {
                localStorage.removeItem('megatron_admin');
                router.push('/admin/login');
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('megatron_admin');
        router.push('/admin/login');
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
            {/* Header */}
            <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded shadow-lg shadow-primary/20 flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">
                                M
                            </span>
                        </div>
                        <h1 className="text-xl font-bold">
                            Megatron Admin
                        </h1>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group">
                        <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                            Total Users
                        </p>
                        <p className="text-3xl font-bold mt-1">
                            {stats?.totalUsers ?? '--'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Live from database
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group">
                        <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                            Active Assets
                        </p>
                        <p className="text-3xl font-bold mt-1">
                            {stats?.activeAssets ?? '--'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Markets currently trading
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group">
                        <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                            Total Volume (24h)
                        </p>
                        <p className="text-3xl font-bold mt-1">
                            ${stats?.totalVolume24h?.toLocaleString() ?? '--'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Global trade volume
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors group">
                        <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                            Platform Revenue
                        </p>
                        <p className="text-3xl font-bold mt-1">
                            ${stats?.platformFees?.toLocaleString() ?? '--'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Cumulative treasury balance
                        </p>
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
                                    <p className="font-bold text-primary">Review Asset Requests</p>
                                    <p className="text-sm text-muted-foreground">Approve or reject new market suggestions from users.</p>
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

