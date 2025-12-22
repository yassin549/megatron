'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function WalletPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [walletData, setWalletData] = useState({
        hotBalance: 0,
        coldBalance: 0,
        depositAddress: '',
        loading: true,
    });

    // Fetch real wallet data from API
    useEffect(() => {
        if (status === 'authenticated') {
            const fetchWalletData = async () => {
                try {
                    const res = await fetch('/api/user/me');
                    if (res.ok) {
                        const data = await res.json();
                        setWalletData({
                            hotBalance: parseFloat(data.walletHotBalance || '0'),
                            coldBalance: parseFloat(data.walletColdBalance || '0'),
                            depositAddress: data.depositAddress || '',
                            loading: false,
                        });
                    }
                } catch (error) {
                    console.error('Failed to fetch wallet data:', error);
                    setWalletData(prev => ({ ...prev, loading: false }));
                }
            };
            fetchWalletData();
            // Poll every 15 seconds for real-time updates
            const interval = setInterval(fetchWalletData, 15000);
            return () => clearInterval(interval);
        }
    }, [status]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    if (status === 'loading' || walletData.loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your USDC deposits and withdrawals
                    </p>
                </div>

                {/* Balance Cards - Compact Mobile Design */}
                <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-6 mb-8">
                    {/* Hot Wallet */}
                    <div className="glass-card rounded-xl p-4 md:p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs md:text-sm text-muted-foreground">Hot Wallet</span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 hidden md:inline">
                                            Available
                                        </span>
                                    </div>
                                    <p className="text-xl md:text-3xl font-bold text-foreground font-mono">
                                        ${walletData.hotBalance.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 md:hidden flex-shrink-0">
                                Ready
                            </span>
                        </div>
                        <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl z-0" />
                    </div>

                    {/* Cold Wallet */}
                    <div className="glass-card rounded-xl p-4 md:p-6 relative overflow-hidden">
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 md:w-6 md:h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs md:text-sm text-muted-foreground">Cold Wallet</span>
                                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 hidden md:inline">
                                            Vesting
                                        </span>
                                    </div>
                                    <p className="text-xl md:text-3xl font-bold text-foreground font-mono">
                                        ${walletData.coldBalance.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 md:hidden flex-shrink-0">
                                Locked
                            </span>
                        </div>
                        <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl z-0" />
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    {/* Deposit Section */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Deposit USDC
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Send USDC on Arbitrum to your deposit address. Minimum deposit: $10.
                        </p>

                        <div className="bg-secondary rounded-lg p-4 mb-4">
                            <p className="text-xs text-muted-foreground mb-2">
                                Your Deposit Address (Arbitrum)
                            </p>
                            <code className="text-sm text-foreground break-all">
                                {walletData.depositAddress}
                            </code>
                        </div>

                        <button className="w-full py-3 bg-secondary text-foreground font-medium rounded-lg border border-border hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Address
                        </button>

                        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <p className="text-sm text-primary font-medium mb-1">
                                ⚠️ Important
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Only send USDC on Arbitrum network</li>
                                <li>• Other tokens will be lost</li>
                                <li>• Deposits confirm in ~3 minutes</li>
                            </ul>
                        </div>
                    </div>

                    {/* Withdraw Section */}
                    <div className="bg-card border border-border rounded-xl p-6">
                        <h2 className="text-lg font-semibold text-foreground mb-4">
                            Withdraw USDC
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            Withdraw funds to any Arbitrum address. Processing time: 1-24 hours.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-muted-foreground mb-2">
                                    Amount (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-muted-foreground mb-2">
                                    Destination Address
                                </label>
                                <input
                                    type="text"
                                    value={withdrawAddress}
                                    onChange={(e) => setWithdrawAddress(e.target.value)}
                                    placeholder="0x..."
                                    className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <button
                                disabled={!withdrawAmount || !withdrawAddress || walletData.hotBalance <= 0}
                                className="w-full py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Request Withdrawal
                            </button>

                            <p className="text-xs text-muted-foreground text-center">
                                Available: ${walletData.hotBalance.toFixed(2)} USDC
                            </p>
                        </div>
                    </div>
                </div>

                {/* Transaction History */}
                <div className="mt-8 bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-border">
                        <h2 className="font-semibold text-foreground">Transaction History</h2>
                    </div>
                    <div className="p-12 text-center">
                        <p className="text-muted-foreground">
                            No transactions yet
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
