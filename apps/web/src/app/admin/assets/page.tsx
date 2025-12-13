'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateAssetModal } from '@/components/admin/CreateAssetModal';
import Link from 'next/link';

// Mock data
const mockAssets = [
    { id: '1', name: 'Bitcoin Twitter Sentiment', type: 'social', status: 'active', liquidity: 50000, volume24h: 45000, createdAt: '2024-12-01' },
    { id: '2', name: 'US Unemployment Rate', type: 'economics', status: 'active', liquidity: 32000, volume24h: 32000, createdAt: '2024-12-02' },
    { id: '3', name: 'Premier League Champion', type: 'sports', status: 'funding', liquidity: 15000, volume24h: 0, createdAt: '2024-12-05' },
    { id: '4', name: 'AI Hype Index', type: 'social', status: 'paused', liquidity: 8000, volume24h: 0, createdAt: '2024-11-28' },
];

export default function AdminAssetsPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [assets, setAssets] = useState<any[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Placeholder for modal
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const checkAdmin = async () => {
            // Basic localStorage check first
            const adminSession = localStorage.getItem('megatron_admin');
            if (adminSession !== 'true') {
                router.push('/admin/login');
                return;
            }

            // Then fetch data
            try {
                const res = await fetch('/api/assets'); // Use public asset API for list
                if (res.ok) {
                    const data = await res.json();
                    setAssets(data.assets || []);
                }
                setIsAdmin(true);
            } catch (error) {
                console.error('Failed to load assets:', error);
            } finally {
                setLoading(false);
            }
        };
        checkAdmin();
    }, [router]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/assets?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                // Optimistic Update
                setAssets(prev => prev.filter(a => a.id !== id));
                alert('Asset deleted successfully');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete asset');
            }
        } catch (error) {
            console.error('Error deleting asset:', error);
            alert('Error deleting asset');
        }
    };

    const handleEdit = (asset: any) => {
        setEditingAsset(asset);
        setIsCreateModalOpen(true);
    };

    const handleCreate = () => {
        setEditingAsset(null);
        setIsCreateModalOpen(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground animate-pulse">Checking Admin Privileges...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Admin Header */}
            <header className="border-b border-border bg-card">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                                <span className="text-primary-foreground font-bold text-sm">M</span>
                            </div>
                            <span className="font-bold text-foreground">Admin</span>
                        </Link>
                        <nav className="flex items-center gap-4 ml-8">
                            <Link href="/admin/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                                Dashboard
                            </Link>
                            <Link href="/admin/assets" className="text-sm text-primary font-medium">
                                Assets
                            </Link>
                            <Link href="/admin/requests" className="text-sm text-muted-foreground hover:text-foreground">
                                Requests
                            </Link>
                            <Link href="/admin/users" className="text-sm text-muted-foreground hover:text-foreground">
                                Users
                            </Link>
                        </nav>
                    </div>
                    <button
                        onClick={() => {
                            localStorage.removeItem('megatron_admin');
                            router.push('/admin/login');
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground"
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Assets</h1>
                        <p className="text-muted-foreground">Manage all platform assets</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        Create Asset
                    </button>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-muted-foreground border-b border-border">
                                <th className="px-6 py-4 font-medium">Name</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Liquidity</th>
                                <th className="px-6 py-4 font-medium text-right">24h Volume</th>
                                <th className="px-6 py-4 font-medium">Wait Time</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                                        No assets found.
                                    </td>
                                </tr>
                            )}
                            {assets.map((asset) => (
                                <tr key={asset.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleEdit(asset)}
                                            className="font-medium text-foreground hover:text-primary block truncate max-w-[200px] text-left"
                                        >
                                            {asset.name}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground capitalize">
                                        {asset.type}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${asset.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                            asset.status === 'funding' ? 'bg-yellow-500/10 text-yellow-500' :
                                                asset.status === 'paused' ? 'bg-orange-500/10 text-orange-500' :
                                                    'bg-muted text-muted-foreground'
                                            }`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right text-foreground font-mono text-sm">
                                        ${(asset.poolLiquidity || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-foreground font-mono text-sm">
                                        ${(asset.volume24h || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground text-sm">
                                        {asset.fundingDeadline ? new Date(asset.fundingDeadline).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleEdit(asset)}
                                            className="text-sm text-primary hover:text-primary/80 hover:underline mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(asset.id, asset.name)}
                                            className="text-sm text-red-500 hover:text-red-400 hover:underline"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Create/Edit Asset Modal */}
            {isCreateModalOpen && (
                <CreateAssetModal
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setEditingAsset(null); // Clear editing asset on close
                    }}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        setEditingAsset(null); // Clear editing asset on success
                        // Quick hack: force refresh or re-fetch would be better
                        // For now just alert or reload logic.
                        // Better: re-fetch assets
                        fetch('/api/assets').then(res => res.json()).then(data => setAssets(data.assets));
                        alert(editingAsset ? 'Asset updated successfully' : 'Asset created successfully');
                    }}
                    initialData={editingAsset}
                />
            )}
        </div>
    );
}
