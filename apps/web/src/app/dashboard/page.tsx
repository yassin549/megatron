'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DepositCard } from '@/components/dashboard';

interface UserData {
    id: string;
    email: string;
    walletHotBalance: string;
    walletColdBalance: string;
    depositAddress: string;
    isAdmin: boolean;
    createdAt: string;
}

export default function DashboardPage() {
    const { data: session, status } = useSession();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
            return;
        }

        if (status === 'authenticated') {
            fetchUserData();
        }
    }, [status, router]);

    const fetchUserData = async () => {
        try {
            const res = await fetch('/api/user/me');
            if (!res.ok) {
                throw new Error('Failed to fetch user data');
            }
            const data = await res.json();

            // If user doesn't have a deposit address, generate one
            if (!data.depositAddress) {
                try {
                    const depositRes = await fetch('/api/wallet/deposit');
                    if (depositRes.ok) {
                        const depositData = await depositRes.json();
                        data.depositAddress = depositData.address;
                    }
                } catch (depositErr) {
                    console.error('Failed to generate deposit address:', depositErr);
                }
            }

            setUserData(data);
        } catch (err) {
            setError('Failed to load user data');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-destructive">{error}</div>
            </div>
        );
    }

    const totalBalance = parseFloat(userData?.walletHotBalance || '0') + parseFloat(userData?.walletColdBalance || '0');

    return (
        <div className="min-h-screen bg-background">
            <main className="max-w-7xl mx-auto px-4 py-8">
                {/* Welcome Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        Welcome back
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {userData?.email}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
                    {/* Total Balance Card */}
                    <div className="bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 rounded-xl p-6">
                        <h2 className="text-sm font-medium text-muted-foreground mb-2">
                            Total Balance
                        </h2>
                        <p className="text-4xl font-bold text-foreground">
                            ${totalBalance.toFixed(2)}
                        </p>
                        <div className="mt-4 pt-4 border-t border-primary/20 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Available</span>
                                <span className="text-foreground font-medium">
                                    ${parseFloat(userData?.walletHotBalance || '0').toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">In LP</span>
                                <span className="text-foreground font-medium">
                                    ${parseFloat(userData?.walletColdBalance || '0').toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions Card */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Quick Actions
                        </h2>
                        <div className="space-y-3">
                            <Link
                                href="/assets"
                                className="block w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg text-center hover:bg-primary/90 transition-colors"
                            >
                                Trade Assets
                            </Link>
                            <Link
                                href="/lp"
                                className="block w-full py-3 px-4 bg-secondary text-foreground font-medium rounded-lg border border-border text-center hover:bg-secondary/80 transition-colors"
                            >
                                Provide Liquidity
                            </Link>
                            <Link
                                href="/wallet"
                                className="block w-full py-3 px-4 bg-secondary text-foreground font-medium rounded-lg border border-border text-center hover:bg-secondary/80 transition-colors"
                            >
                                Withdraw
                            </Link>
                        </div>
                    </div>

                    {/* Expandable Deposit Card */}
                    <DepositCard depositAddress={userData?.depositAddress} />
                </div>

                {/* Portfolio Section */}
                <div className="mt-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-foreground">
                            Your Portfolio
                        </h2>
                        <Link
                            href="/portfolio"
                            className="text-sm text-primary hover:underline"
                        >
                            View all →
                        </Link>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-8 text-center">
                        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                className="w-8 h-8 text-muted-foreground"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                />
                            </svg>
                        </div>
                        <p className="text-muted-foreground mb-4">
                            No positions yet. Start trading to build your portfolio.
                        </p>
                        <Link
                            href="/assets"
                            className="inline-block px-6 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            Browse Assets
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
