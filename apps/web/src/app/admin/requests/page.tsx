'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Search,
    Check,
    X,
    Loader2
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

export default function AdminRequestsPage() {
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const router = useRouter();

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const sessionRes = await fetch('/api/user/me');
                if (!sessionRes.ok) {
                    router.push('/login');
                    return;
                }
                const sessionData = await sessionRes.json();
                if (!sessionData?.isAdmin) {
                    router.push('/login');
                    return;
                }

                const res = await fetch('/api/admin/requests');
                if (res.ok) {
                    const data = await res.json();
                    setRequests(data.requests || []);
                }
            } catch (error) {
                console.error('Failed to load requests:', error);
            } finally {
                setLoading(false);
            }
        };
        checkAdmin();
    }, [router]);

    const { showNotification, showConfirm } = useNotification();

    const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
        showConfirm({
            message: `Are you sure you want to ${status} this request?`,
            confirmText: status.charAt(0).toUpperCase() + status.slice(1),
            onConfirm: async () => {
                try {
                    const res = await fetch('/api/admin/requests', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ requestId: id, status }),
                    });

                    if (res.ok) {
                        setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
                        showNotification('success', `Request ${status} successfully`);
                    } else {
                        const data = await res.json();
                        showNotification('error', data.error || `Failed to ${status} request`);
                    }
                } catch (error) {
                    console.error(`Error updating request status:`, error);
                    showNotification('error', `Error updating request`);
                }
            }
        });
    };

    if (loading && requests.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Checking Admin Privileges...
                </div>
            </div>
        );
    }

    const filteredRequests = requests.filter(req =>
        req.variableName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-background text-foreground tracking-tight antialiased">


            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Asset Requests</h1>
                        <p className="text-muted-foreground">Review and manage community asset proposals</p>
                    </div>
                    <div className="relative group w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search requests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 w-full transition-all"
                        />
                    </div>
                </div>

                <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-sm text-muted-foreground bg-secondary/30">
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Proposal</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">User</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredRequests.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                                                    <Search className="w-6 h-6 opacity-20" />
                                                </div>
                                                <p>No matching requests found.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {filteredRequests.map((request) => {
                                    // Parse type from suggestedQueries
                                    let type = 'Market';
                                    if (Array.isArray(request.suggestedQueries)) {
                                        if (request.suggestedQueries.some((q: any) => typeof q === 'string' && q.includes('TYPE:FEATURE'))) {
                                            type = 'Feature';
                                        }
                                    }

                                    return (
                                        <tr key={request.id} className="hover:bg-primary/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${type === 'Feature'
                                                    ? 'bg-amber-500/10 text-amber-500'
                                                    : 'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="max-w-[300px]">
                                                    <div className="font-bold text-foreground">{request.variableName}</div>
                                                    <p className="text-sm text-muted-foreground line-clamp-1" title={request.description}>
                                                        {request.description}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium">
                                                {request.userEmail}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md border ${request.status === 'pending' || request.status === 'submitted' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                    request.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                        'bg-red-500/10 text-red-500 border-red-500/20'
                                                    }`}>
                                                    {request.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {(request.status === 'pending' || request.status === 'submitted') && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleUpdateStatus(request.id, 'approved')}
                                                            className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-all shadow-lg shadow-green-500/20 flex items-center gap-1.5"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                                            className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-1.5"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}
                                                {request.status !== 'pending' && request.status !== 'submitted' && (
                                                    <span className="text-xs text-muted-foreground italic">Processed</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
