'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateAssetModal } from '@/components/admin/CreateAssetModal';
import Link from 'next/link';
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    BarChart3,
    Loader2
} from 'lucide-react';

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
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkAdmin = async () => {
            const adminSession = localStorage.getItem('megatron_admin');
            if (adminSession !== 'true') {
                router.push('/admin/login');
                return;
            }

            try {
                const res = await fetch('/api/assets');
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

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/assets');
            if (res.ok) {
                const data = await res.json();
                setAssets(data.assets || []);
            }
        } catch (err) {
            console.error('Failed to refresh assets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

        try {
            const res = await fetch(`/api/admin/assets?id=${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
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

    if (loading && assets.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Checking Admin Privileges...
                </div>
            </div>
        );
    }

    const filteredAssets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-foreground tracking-tight antialiased">


            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Assets</h1>
                        <p className="text-muted-foreground">Manage and monitor all platform prediction markets</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search markets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-full sm:w-64 transition-all"
                            />
                        </div>
                        <button
                            onClick={handleCreate}
                            className="w-full sm:w-auto px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Create Asset
                        </button>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-muted-foreground bg-secondary/30">
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Asset Details</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Liquidity</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">24h Volume</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredAssets.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                                                    <Search className="w-6 h-6 opacity-20" />
                                                </div>
                                                <p>No matching assets found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {filteredAssets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-primary/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {asset.imageUrl ? (
                                                    <img src={asset.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-secondary" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                                                        <BarChart3 className="w-5 h-5 opacity-40" />
                                                    </div>
                                                )}
                                                <div className="max-w-[220px]">
                                                    <button
                                                        onClick={() => handleEdit(asset)}
                                                        className="font-bold text-foreground hover:text-primary transition-colors text-left block truncate"
                                                        title={asset.name}
                                                    >
                                                        {asset.name}
                                                    </button>
                                                    <p className="text-xs text-muted-foreground truncate">{asset.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-md bg-secondary text-secondary-foreground border border-border">
                                                {asset.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md border ${asset.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                asset.status === 'funding' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                    asset.status === 'paused' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                                        'bg-muted text-muted-foreground border-border'
                                                }`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-foreground font-bold font-mono">
                                                ${(asset.poolLiquidity || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="text-foreground font-bold font-mono">
                                                ${(asset.volume24h || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(asset)}
                                                    className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Edit Asset"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(asset.id, asset.name)}
                                                    className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Delete Asset"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Create/Edit Asset Modal */}
            {isCreateModalOpen && (
                <CreateAssetModal
                    onClose={() => {
                        setIsCreateModalOpen(false);
                        setEditingAsset(null);
                    }}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        setEditingAsset(null);
                        fetchAssets();
                    }}
                    initialData={editingAsset}
                />
            )}
        </div>
    );
}

