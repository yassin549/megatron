'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { MobileListRow } from '@/components/mobile/MobileListRow';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
    id: string;
    amount: number;
    type: 'deposit' | 'withdrawal' | 'trade' | 'lp_reward' | 'fee' | 'incoming' | 'outgoing';
    status: 'confirmed' | 'pending' | 'processing' | 'failed' | 'completed';
    timestamp: string;
    details?: string;
    txHash?: string;
    confirmations?: number;
}

export default function WalletPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawAddress, setWithdrawAddress] = useState('');
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [walletData, setWalletData] = useState({
        hotBalance: 0,
        coldBalance: 0,
        onChainBalance: 0,
        depositAddress: '',
        loading: true,
    });
    const [history, setHistory] = useState<Transaction[]>([]);
    const [copied, setCopied] = useState(false);

    // Fetch real wallet data and history
    const fetchData = async () => {
        if (status !== 'authenticated') return;

        try {
            // Fetch User/Balance
            const userRes = await fetch('/api/user/me');
            if (userRes.ok) {
                const data = await userRes.json();
                setWalletData({
                    hotBalance: parseFloat(data.walletHotBalance || '0'),
                    coldBalance: parseFloat(data.walletColdBalance || '0'),
                    onChainBalance: parseFloat(data.onChainDepositBalance || '0'),
                    depositAddress: data.depositAddress || '',
                    loading: false,
                });
            }

            // Fetch History
            const historyRes = await fetch('/api/wallet/history');
            if (historyRes.ok) {
                const data = await historyRes.json();

                const combined: Transaction[] = [
                    // Ledger entries (Trade, Deposit, Reward, etc.)
                    ...data.ledger.map((l: any) => ({
                        id: l.id,
                        amount: Math.abs(parseFloat(l.deltaAmount)),
                        type: l.reason,
                        status: 'confirmed',
                        timestamp: l.createdAt,
                        txHash: l.refId
                    })),
                    // Pending Deposits
                    ...data.pendingDeposits.map((d: any) => ({
                        id: d.id,
                        amount: parseFloat(d.amount),
                        type: 'incoming',
                        status: 'pending',
                        timestamp: d.createdAt,
                        txHash: d.txHash,
                        confirmations: d.confirmations
                    })),
                    // All Withdrawal Requests
                    ...data.withdrawals.map((w: any) => ({
                        id: w.id,
                        amount: parseFloat(w.amount),
                        type: 'withdrawal',
                        status: w.status,
                        timestamp: w.createdAt,
                        txHash: w.txHash,
                        details: w.error
                    }))
                ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                setHistory(combined);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
    };

    useEffect(() => {
        if (status === 'authenticated') {
            fetchData();
            const interval = setInterval(fetchData, 10000); // Poll every 10s for confirmation updates
            return () => clearInterval(interval);
        }
    }, [status]);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/login');
        }
    }, [status, router]);

    const handleGenerateAddress = async () => {
        setIsGenerating(true);
        try {
            // Updated to call the new Create Wallet endpoint
            const res = await fetch('/api/wallet/create', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                setWalletData(prev => ({
                    ...prev,
                    depositAddress: data.address,
                    // Optionally store walletId if we added it to state
                }));
                // Refund / Refresh data
                fetchData();
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: err.error || 'Failed to create wallet' });
            }
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Network error creating wallet' });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleWithdraw = async () => {
        if (!withdrawAmount || !withdrawAddress) return;

        setIsWithdrawing(true);
        setMessage(null);

        try {
            const res = await fetch('/api/wallet/withdraw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(withdrawAmount),
                    toAddress: withdrawAddress
                })
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', text: 'Withdrawal request submitted!' });
                setWithdrawAmount('');
                setWithdrawAddress('');
                fetchData();
            } else {
                setMessage({ type: 'error', text: data.error || 'Withdrawal failed' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setIsWithdrawing(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    if (status === 'loading' || (walletData.loading && status === 'authenticated')) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-foreground font-medium">Loading Wallet...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent">
            {/* =========================================
                DESKTOP VIEW (Hidden on Mobile)
               ========================================= */}
            <div className="hidden md:block">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-foreground">Wallet</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage your USDC deposits and withdrawals on Arbitrum
                        </p>
                    </div>

                    {message && (
                        <div className={`mb-6 p-4 rounded-xl border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Balance Cards */}
                    <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-6 mb-8">
                        {/* Main Wallet Balance */}
                        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/5">
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground block mb-1">Total Available Balance</span>
                                        <p className="text-3xl font-bold text-foreground font-mono">
                                            ${(walletData.hotBalance + walletData.onChainBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-blue-400 animate-pulse" />
                                                On-chain: ${walletData.onChainBalance.toFixed(2)}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                <div className="w-1 h-1 rounded-full bg-emerald-400" />
                                                Account: ${walletData.hotBalance.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                        </div>

                        {/* Cold Wallet */}
                        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group border border-white/5">
                            <div className="flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <span className="text-sm text-muted-foreground block mb-1">Staked/Vested Balance</span>
                                        <p className="text-3xl font-bold text-foreground font-mono">
                                            ${walletData.coldBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                                    COLD
                                </span>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Deposit Section */}
                        <div className="bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-semibold text-foreground">Deposit USDC</h2>
                            </div>

                            <p className="text-sm text-muted-foreground mb-6">
                                Send USDC on <span className="text-blue-400 font-medium">Arbitrum</span> to your permanent deposit address.
                            </p>

                            {!walletData.depositAddress ? (
                                <button
                                    onClick={handleGenerateAddress}
                                    disabled={isGenerating}
                                    className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Real Wallet & Address'}
                                </button>
                            ) : (
                                <>
                                    <div className="bg-black/20 rounded-xl p-4 mb-4 border border-white/5">
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">
                                            Your Arbitrum Address
                                        </p>
                                        <code className="text-sm text-blue-300 break-all font-mono leading-relaxed">
                                            {walletData.depositAddress}
                                        </code>
                                    </div>

                                    <button
                                        onClick={() => copyToClipboard(walletData.depositAddress)}
                                        className={`w-full py-3 font-medium rounded-xl border transition-all flex items-center justify-center gap-2 ${copied
                                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                            : 'bg-white/5 text-foreground border-white/10 hover:bg-white/10'
                                            }`}
                                    >
                                        {copied ? (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Copy Address
                                            </>
                                        )}
                                    </button>
                                </>
                            )}

                            <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Network Rules
                                </h4>
                                <ul className="text-[11px] text-muted-foreground space-y-1.5">
                                    <li className="flex items-start gap-2">• <span className="mt-0.5">ONLY send <span className="text-white">USDC</span>. Other tokens will be lost forever.</span></li>
                                    <li className="flex items-start gap-2">• <span className="mt-0.5">Network: <span className="text-blue-400">Arbitrum One</span>. No other networks supported.</span></li>
                                    <li className="flex items-start gap-2">• <span className="mt-0.5">Confirmations: 12 blocks (~3 mins).</span></li>
                                </ul>
                            </div>
                        </div>

                        {/* Withdraw Section */}
                        <div className="bg-card/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-semibold text-foreground">Withdraw USDC</h2>
                            </div>

                            <p className="text-sm text-muted-foreground mb-6">
                                Transfer your funds to any Arbitrum wallet.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">
                                        Amount (USDC)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-4 py-4 bg-black/20 border border-white/5 rounded-xl text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        />
                                        <button
                                            onClick={() => setWithdrawAmount(walletData.hotBalance.toString())}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-bold bg-white/5 text-muted-foreground rounded-lg hover:text-white transition-colors"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">
                                        Recipient Address (Arbitrum)
                                    </label>
                                    <input
                                        type="text"
                                        value={withdrawAddress}
                                        onChange={(e) => setWithdrawAddress(e.target.value)}
                                        placeholder="0x..."
                                        className="w-full px-4 py-4 bg-black/20 border border-white/5 rounded-xl text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>

                                <button
                                    onClick={handleWithdraw}
                                    disabled={!withdrawAmount || !withdrawAddress || walletData.hotBalance < parseFloat(withdrawAmount) || isWithdrawing}
                                    className="w-full py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                >
                                    {isWithdrawing ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Request Withdrawal'}
                                </button>

                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] text-muted-foreground">Network Fee: ~$0.50</span>
                                    <span className="text-[10px] text-muted-foreground">Effective: ${(parseFloat(withdrawAmount || '0')).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction History */}
                    <div className="mt-12 bg-card/50 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                        <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                            <h2 className="font-bold text-foreground flex items-center gap-2">
                                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Activity History
                            </h2>
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest bg-black/30 px-3 py-1 rounded-full border border-white/5">
                                Auto-refreshing
                            </span>
                        </div>

                        <div className="divide-y divide-white/5">
                            {history.length === 0 ? (
                                <div className="p-20 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/5">
                                        <svg className="w-8 h-8 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                        </svg>
                                    </div>
                                    <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
                                </div>
                            ) : (
                                history.map((tx) => (
                                    <div key={tx.id} className="px-8 py-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tx.type === 'deposit' || tx.type === 'incoming'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                : tx.type === 'withdrawal' || tx.type === 'outgoing'
                                                    ? 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                                                }`}>
                                                {tx.type === 'deposit' || tx.type === 'incoming' ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                                    </svg>
                                                ) : tx.type === 'withdrawal' || tx.type === 'outgoing' ? (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-foreground capitalize">
                                                        {tx.type.replace('_', ' ')}
                                                    </span>
                                                    <span className={`text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded border ${tx.status === 'confirmed' || tx.status === 'completed'
                                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                        : tx.status === 'failed'
                                                            ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                                            : 'bg-white/5 border-white/10 text-muted-foreground animate-pulse'
                                                        }`}>
                                                        {tx.status === 'pending' && tx.confirmations !== undefined
                                                            ? `Confirming (${tx.confirmations}/12)`
                                                            : tx.status}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-muted-foreground mt-0.5 block">
                                                    {new Date(tx.timestamp).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-bold font-mono text-lg ${tx.type === 'deposit' || tx.type === 'incoming' ? 'text-emerald-400' : 'text-foreground'
                                                }`}>
                                                {tx.type === 'deposit' || tx.type === 'incoming' ? '+' : '-'}${tx.amount.toFixed(2)}
                                            </p>
                                            {tx.txHash ? (
                                                <a
                                                    href={`https://arbiscan.io/tx/${tx.txHash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-blue-400/60 hover:text-blue-400 transition-colors flex items-center justify-end gap-1"
                                                >
                                                    View Tx
                                                    <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                    </svg>
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground">Internal</span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* =========================================
                MOBILE VIEW (Visible on Mobile)
               ========================================= */}
            <div className="md:hidden pb-24">
                <MobilePageHeader
                    title="Wallet"
                    description="Deposits & Withdrawals"
                />

                <div className="px-4 py-6 space-y-6">
                    {/* 1. Total Balance Card */}
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-[#1a1f35] to-[#0f1219] border border-white/5 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[50px] rounded-full -translate-y-1/2 translate-x-1/2" />

                        <div className="relative z-10">
                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Available Balance</span>
                            <div className="flex items-end gap-3 mt-2 mb-4">
                                <h2 className="text-4xl font-mono font-bold text-white tracking-tight">
                                    ${(walletData.hotBalance + walletData.onChainBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </h2>
                            </div>

                            <div className="flex gap-2">
                                <span className="text-[10px] px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded font-mono">
                                    On-Chain: ${walletData.onChainBalance.toFixed(2)}
                                </span>
                                <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono">
                                    Hot: ${walletData.hotBalance.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl border text-xs font-bold ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                            {message.text}
                        </div>
                    )}

                    {/* 2. Deposit Section - Compact */}
                    <div className="bg-card/30 border border-white/5 rounded-2xl p-4 overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded bg-blue-500/10 flex items-center justify-center">
                                <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Deposit USDC</h3>
                        </div>

                        {!walletData.depositAddress ? (
                            <button
                                onClick={handleGenerateAddress}
                                disabled={isGenerating}
                                className="w-full py-3 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2"
                            >
                                {isGenerating ? 'Generating...' : 'Create Wallet Address'}
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                                    <p className="text-[8px] uppercase tracking-widest text-muted-foreground mb-1">Arbitrum Address</p>
                                    <code className="text-xs text-blue-300 break-all font-mono">{walletData.depositAddress}</code>
                                </div>
                                <button
                                    onClick={() => copyToClipboard(walletData.depositAddress)}
                                    className={`w-full py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg border flex items-center justify-center gap-2 ${copied
                                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                        : 'bg-white/5 text-foreground border-white/10'}`}
                                >
                                    {copied ? 'Copied' : 'Copy Address'}
                                </button>
                            </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-3 text-center">
                            Send only <span className="text-white font-bold">USDC (Arbitrum One)</span>.
                        </p>
                    </div>

                    {/* 3. Withdraw Section - Compact */}
                    <div className="bg-card/30 border border-white/5 rounded-2xl p-4 overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-6 h-6 rounded bg-orange-500/10 flex items-center justify-center">
                                <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Withdraw</h3>
                        </div>

                        <div className="space-y-3">
                            <input
                                type="number"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                placeholder="Amount (USDC)"
                                className="w-full px-3 py-3 bg-black/40 border border-white/5 rounded-xl text-foreground text-sm font-mono focus:outline-none focus:border-primary/50"
                            />
                            <input
                                type="text"
                                value={withdrawAddress}
                                onChange={(e) => setWithdrawAddress(e.target.value)}
                                placeholder="To Address (0x...)"
                                className="w-full px-3 py-3 bg-black/40 border border-white/5 rounded-xl text-foreground text-sm font-mono focus:outline-none focus:border-primary/50"
                            />
                            <button
                                onClick={handleWithdraw}
                                disabled={!withdrawAmount || !withdrawAddress || walletData.hotBalance < parseFloat(withdrawAmount) || isWithdrawing}
                                className="w-full py-3 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
                            >
                                {isWithdrawing ? 'Processing...' : 'Request Withdrawal'}
                            </button>
                        </div>
                    </div>

                    {/* 4. History List */}
                    <div>
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-4 px-1">Activity Log</h3>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <div className="p-8 text-center bg-card/30 rounded-2xl border border-white/5 border-dashed">
                                    <p className="text-xs text-muted-foreground">No recent activity.</p>
                                </div>
                            ) : (
                                history.map((tx) => (
                                    <MobileListRow
                                        key={tx.id}
                                        label={tx.type.replace('_', ' ')}
                                        subLabel={new Date(tx.timestamp).toLocaleDateString()}
                                        value={`${tx.type === 'deposit' || tx.type === 'incoming' ? '+' : '-'}${tx.amount.toFixed(2)}`}
                                        subValue={
                                            <span className={`${tx.status === 'confirmed' || tx.status === 'completed' ? 'text-emerald-500' :
                                                tx.status === 'failed' ? 'text-red-500' : 'text-amber-500'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        }
                                        icon={
                                            tx.type === 'deposit' || tx.type === 'incoming' ?
                                                <div className="text-emerald-400 rotate-180"><ArrowDownRight size={16} /></div> :
                                                <div className="text-orange-400"><ArrowUpRight size={16} /></div>
                                        }
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
