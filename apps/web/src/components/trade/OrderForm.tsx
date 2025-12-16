'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface OrderFormProps {
    assetId: string;
    assetPrice: number;
    assetSymbol?: string;
}

export function OrderForm({ assetId, assetPrice, assetSymbol = 'Share' }: OrderFormProps) {
    const { status } = useSession();
    const [type, setType] = useState<'buy' | 'sell'>('buy');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [userBalance, setUserBalance] = useState(0);

    // Fetch balance on mount/session load
    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/user/me').then(res => res.json()).then(data => {
                if (data.user) setUserBalance(data.user.walletHotBalance);
            });
        }
    }, [status]);

    const isBuy = type === 'buy';
    const estimatedShares = amount ? parseFloat(amount) / assetPrice : 0;
    const fee = parseFloat(amount || '0') * 0.005; // 0.5% fee

    const handleTrade = async () => {
        if (!amount) return;
        setLoading(true);
        try {
            const res = await fetch('/api/trade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type,
                    assetId: assetId,
                    amount: parseFloat(amount)
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAmount('');
            alert(`Order executed successfully! Trade ID: ${data.tradeId}`);
            window.location.reload();
        } catch (err: any) {
            alert(`Order failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (status !== 'authenticated') {
        return (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center backdrop-blur-sm">
                <p className="text-gray-400 mb-4 text-sm">Sign in to access the order book.</p>
                <Link
                    href="/login"
                    className="inline-block w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                    Connect Wallet
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 backdrop-blur-xl sticky top-36 z-30 shadow-2xl">
            {/* Tabs */}
            <div className="flex bg-black/40 rounded-xl p-1 mb-6 relative border border-white/5">
                <div
                    className={`absolute inset-y-1 w-[calc(50%-4px)] bg-zinc-800 rounded-lg shadow-lg shadow-black/20 transition-all duration-300 ease-out ${isBuy ? 'left-1' : 'left-[calc(50%+2px)]'}`}
                />
                <button
                    onClick={() => setType('buy')}
                    className={`flex-1 py-2.5 text-sm font-bold relative z-10 transition-colors duration-300 ${isBuy ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    BUY
                </button>
                <button
                    onClick={() => setType('sell')}
                    className={`flex-1 py-2.5 text-sm font-bold relative z-10 transition-colors duration-300 ${!isBuy ? 'text-rose-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    SELL
                </button>
            </div>

            {/* Input */}
            <div className="mb-6">
                <div className="flex justify-between text-xs text-zinc-500 mb-2 font-mono uppercase tracking-wider font-semibold">
                    <span>{isBuy ? 'Amount (USDC)' : 'Shares to Sell'}</span>
                    <span>Balance: <span className="text-zinc-300">${userBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></span>
                </div>
                <div className="relative group">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-4 text-2xl font-mono text-white placeholder-zinc-700 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold">
                        {isBuy ? 'USDC' : 'SHARES'}
                    </span>
                </div>
                {/* Presets */}
                <div className="flex gap-2 mt-3">
                    {['100', '500', '1000', 'MAX'].map((val) => (
                        <button
                            key={val}
                            onClick={() => setAmount(val === 'MAX' ? userBalance.toString() : val)}
                            className="flex-1 py-1.5 text-[10px] font-mono font-medium border border-white/5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all hover:scale-105 active:scale-95"
                        >
                            {val}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary */}
            <div className="bg-black/20 border border-white/5 rounded-xl p-5 mb-6 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Market Price</span>
                    <span className="text-white font-medium">${assetPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-zinc-500">Est. Shares</span>
                    <span className="text-white font-medium">{estimatedShares.toFixed(4)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-1">
                    <span className="text-zinc-500">Fee (0.5%)</span>
                    <span className="text-zinc-400">${fee.toFixed(2)}</span>
                </div>
            </div>

            {/* Action Button */}
            <button
                onClick={handleTrade}
                disabled={!amount || loading}
                className={`w-full py-4 rounded-xl font-bold text-sm tracking-widest shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase
                    ${isBuy
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-900/20'
                        : 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-900/20'
                    }`}
            >
                {loading ? 'EXECUTING...' : `PLACE ${type} ORDER`}
            </button>
        </div>
    );
}
