'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Mock data
const mockRequests = [
    { id: '1', name: 'Reddit Wallstreetbets Activity', type: 'social', status: 'pending', requestedBy: 'user@test.com', createdAt: '2024-12-05' },
    { id: '2', name: 'Super Bowl Winner 2025', type: 'sports', status: 'pending', requestedBy: 'trader@example.com', createdAt: '2024-12-04' },
    { id: '3', name: 'Amazon Stock Split Likelihood', type: 'economics', status: 'approved', requestedBy: 'investor@mail.com', createdAt: '2024-12-03' },
    { id: '4', name: 'US Election 2028', type: 'social', status: 'rejected', requestedBy: 'politico@test.com', createdAt: '2024-12-02' },
];

export default function AdminRequestsPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [requests, setRequests] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        const checkAdmin = async () => {
            // Basic localStorage check first (fast)
            const adminSession = localStorage.getItem('megatron_admin');
            if (adminSession !== 'true') {
                router.push('/admin/login');
                return;
            }

            // Then fetch data (which validates auth on server)
            try {
                const res = await fetch('/api/admin/requests');
                if (res.status === 401) {
                    localStorage.removeItem('megatron_admin');
                    router.push('/admin/login');
                    return;
                }
                const data = await res.json();
                setRequests(data.requests || []);
                setIsAdmin(true);
            } catch (error) {
                console.error('Failed to load requests:', error);
            } finally {
                setLoading(false);
            }
        };
        checkAdmin();
    }, [router]);

    const handleUpdateStatus = async (requestId: string, status: 'approved' | 'rejected') => {
        try {
            const res = await fetch('/api/admin/requests', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId, status, adminNotes: `Manually ${status} by admin` })
            });

            if (res.ok) {
                // Optimistic Update
                setRequests(prev => prev.map(r =>
                    r.id === requestId ? { ...r, status } : r
                ));
            } else {
                alert('Failed to update request status');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error updating status');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground animate-pulse">Checking Admin Privileges...</div>
            </div>
        );
    }

    const pendingCount = requests.filter(r => r.status === 'submitted' || r.status === 'pending').length;

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
                            <Link href="/admin/assets" className="text-sm text-muted-foreground hover:text-foreground">
                                Assets
                            </Link>
                            <Link href="/admin/requests" className="text-sm text-primary font-medium">
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
                        <h1 className="text-2xl font-bold text-foreground">Asset Requests</h1>
                        <p className="text-muted-foreground">
                            {pendingCount} pending request{pendingCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {requests.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            No requests found.
                        </div>
                    )}
                    {requests.map((request) => (
                        <div key={request.id} className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-foreground">{request.variableName}</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Type: Generated • Requested by {request.user?.email || 'Unknown'}
                                    </p>
                                    {request.description && (
                                        <p className="text-sm text-zinc-500 mt-2 italic">{request.description}</p>
                                    )}
                                </div>
                                <span className={`px-3 py-1 text-xs rounded-full capitalize ${request.status === 'submitted' || request.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                    request.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                                        'bg-red-500/10 text-red-500'
                                    }`}>
                                    {request.status}
                                </span>
                            </div>

                            {(request.status === 'submitted' || request.status === 'pending') && (
                                <div className="flex items-center gap-3 pt-4 border-t border-border">
                                    <button
                                        onClick={() => handleUpdateStatus(request.id, 'approved')}
                                        className="px-4 py-2 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                        className="px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}
