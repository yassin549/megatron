'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboardPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check admin session
        const adminSession = localStorage.getItem('megatron_admin');
        if (adminSession !== 'true') {
            router.push('/admin/login');
            return;
        }
        setIsAdmin(true);
        setLoading(false);
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('megatron_admin');
        router.push('/admin/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading...</div>
            </div>
        );
    }

    if (!isAdmin) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                            <span className="text-primary-foreground font-bold text-sm">
                                M
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-foreground">
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
                    <div className="bg-card border border-border rounded-lg p-6">
                        <p className="text-sm text-muted-foreground">
                            Total Users
                        </p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                            --
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Coming soon
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-6">
                        <p className="text-sm text-muted-foreground">
                            Active Assets
                        </p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                            --
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Coming soon
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-6">
                        <p className="text-sm text-muted-foreground">
                            Total Volume (24h)
                        </p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                            $--
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Coming soon
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-lg p-6">
                        <p className="text-sm text-muted-foreground">
                            Platform Fees
                        </p>
                        <p className="text-3xl font-bold text-foreground mt-1">
                            $--
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                            Coming soon
                        </p>
                    </div>
                </div>

                {/* Admin Actions */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Asset Management */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Asset Management
                        </h2>
                        <div className="space-y-3">
                            <Link
                                href="/admin/requests"
                                className="block w-full py-2 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors text-center"
                            >
                                Review Asset Requests
                            </Link>
                            <Link
                                href="/admin/assets"
                                className="block w-full py-2 px-4 bg-secondary text-secondary-foreground font-medium rounded-lg border border-border hover:bg-secondary/80 transition-colors text-center"
                            >
                                Manage Assets (Create/Delete)
                            </Link>
                        </div>
                    </div>

                    {/* User Management */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            User Management
                        </h2>
                        <div className="space-y-3">
                            <button
                                disabled
                                className="w-full py-2 px-4 bg-secondary text-secondary-foreground font-medium rounded-lg border border-border opacity-50 cursor-not-allowed text-left"
                            >
                                View All Users (Milestone 7)
                            </button>
                            <button
                                disabled
                                className="w-full py-2 px-4 bg-secondary text-secondary-foreground font-medium rounded-lg border border-border opacity-50 cursor-not-allowed text-left"
                            >
                                Blacklist Management (Milestone 8)
                            </button>
                        </div>
                    </div>

                    {/* System Health */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            System Health
                        </h2>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center py-2 border-b border-border">
                                <span className="text-muted-foreground">
                                    Database
                                </span>
                                <span className="text-green-500 font-medium">
                                    ● Connected
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border">
                                <span className="text-muted-foreground">
                                    Redis
                                </span>
                                <span className="text-muted-foreground">
                                    ○ Not configured
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-muted-foreground">
                                    Worker
                                </span>
                                <span className="text-muted-foreground">
                                    ○ Not running
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="bg-card border border-border rounded-lg p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Quick Links
                        </h2>
                        <div className="space-y-3">
                            <Link
                                href="/dashboard"
                                className="block w-full py-2 px-4 bg-secondary text-secondary-foreground font-medium rounded-lg border border-border hover:bg-secondary/80 transition-colors text-left"
                            >
                                View User Dashboard
                            </Link>
                            <a
                                href="https://console.neon.tech"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full py-2 px-4 bg-secondary text-secondary-foreground font-medium rounded-lg border border-border hover:bg-secondary/80 transition-colors text-left"
                            >
                                Neon Database Console ↗
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
