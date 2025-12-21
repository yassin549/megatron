'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
    id: string;
    email: string;
    isAdmin: boolean;
    balance: number;
    isBlacklisted: boolean;
    createdAt: string;
}

export default function AdminUsersPage() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Broadcast Modal State
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [broadcastSubject, setBroadcastSubject] = useState('');
    const [broadcastContent, setBroadcastContent] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const [broadcastStatus, setBroadcastStatus] = useState<{ success?: boolean; message?: string; details?: any } | null>(null);

    const router = useRouter();

    useEffect(() => {
        const adminSession = localStorage.getItem('megatron_admin');
        if (adminSession !== 'true') {
            router.push('/admin/login');
            return;
        }
        setIsAdmin(true);
        fetchUsers();
    }, [router]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/users');
            if (!res.ok) {
                if (res.status === 401) {
                    setError('Unauthorized. Please ensure you are logged in as an admin.');
                } else {
                    setError('Failed to fetch users.');
                }
                return;
            }
            const data = await res.json();
            setUsers(data.users);
        } catch (err) {
            setError('An error occurred while fetching users.');
        } finally {
            setLoading(false);
        }
    };

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsBroadcasting(true);
        setBroadcastStatus(null);

        try {
            const res = await fetch('/api/admin/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: broadcastSubject,
                    content: broadcastContent,
                }),
            });

            const data = await res.json();

            if (res.ok) {
                setBroadcastStatus({ success: true, message: data.message });
                setBroadcastSubject('');
                setBroadcastContent('');
                setTimeout(() => setIsBroadcastModalOpen(false), 2000);
            } else {
                setBroadcastStatus({
                    success: false,
                    message: data.error || 'Failed to send broadcast',
                    details: data.details
                });
            }
        } catch (err) {
            setBroadcastStatus({
                success: false,
                message: 'An error occurred while sending broadcast.',
                details: err instanceof Error ? err.message : String(err)
            });
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleBlacklist = async (userId: string, currentStatus: boolean) => {
        const action = currentStatus ? 'unblock' : 'block';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, isBlacklisted: !currentStatus }),
            });

            if (res.ok) {
                setUsers(prev => prev.map(u =>
                    u.id === userId ? { ...u, isBlacklisted: !currentStatus } : u
                ));
            } else {
                alert(`Failed to ${action} user`);
            }
        } catch (err) {
            console.error(`Error during ${action}:`, err);
            alert(`Error during ${action}`);
        }
    };

    if (loading && users.length === 0) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-foreground">Loading users...</div>
            </div>
        );
    }

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                            <Link href="/admin/requests" className="text-sm text-muted-foreground hover:text-foreground">
                                Requests
                            </Link>
                            <Link href="/admin/users" className="text-sm text-primary font-medium">
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
                        <h1 className="text-2xl font-bold text-foreground">Users</h1>
                        <p className="text-muted-foreground">{users.length} total users</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsBroadcastModalOpen(true)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Broadcast Email
                        </button>
                        <input
                            type="text"
                            placeholder="Search by email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary w-64"
                        />
                        <button
                            onClick={fetchUsers}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors"
                            title="Refresh users"
                        >
                            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg mb-6 flex justify-between items-center">
                        <span>{error}</span>
                        <button onClick={fetchUsers} className="text-sm underline hover:no-underline">Retry</button>
                    </div>
                )}

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-sm text-muted-foreground border-b border-border">
                                <th className="px-6 py-4 font-medium">Email</th>
                                <th className="px-6 py-4 font-medium">Role</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium text-right">Balance</th>
                                <th className="px-6 py-4 font-medium">Joined</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-foreground">{user.email}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${user.isAdmin ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'
                                                }`}>
                                                {user.isAdmin ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${user.isBlacklisted ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                                                }`}>
                                                {user.isBlacklisted ? 'Blacklisted' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-foreground">
                                            ${user.balance.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {user.createdAt}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="text-sm text-primary hover:underline mr-4"
                                                onClick={() => router.push(`/admin/users/${user.id}`)}
                                            >
                                                View
                                            </button>
                                            {!user.isAdmin && (
                                                <button
                                                    onClick={() => handleBlacklist(user.id, user.isBlacklisted)}
                                                    className={`text-sm hover:underline ${user.isBlacklisted ? 'text-green-500' : 'text-red-500'
                                                        }`}>
                                                    {user.isBlacklisted ? 'Unblock' : 'Block'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                        {loading ? 'Loading users...' : 'No users found.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Broadcast Modal */}
            {isBroadcastModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/20">
                            <h2 className="text-xl font-bold text-foreground">Broadcast Email</h2>
                            <button
                                onClick={() => setIsBroadcastModalOpen(false)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleBroadcast} className="p-6 space-y-4">
                            {broadcastStatus && (
                                <div className={`p-4 rounded-lg border ${broadcastStatus.success
                                    ? 'bg-green-500/10 border-green-500/20 text-green-500'
                                    : 'bg-destructive/10 border-destructive/20 text-destructive'
                                    }`}>
                                    {broadcastStatus.message}
                                    {broadcastStatus.details && (
                                        <div className="mt-2 text-xs opacity-80 break-words font-mono">
                                            {typeof broadcastStatus.details === 'string'
                                                ? broadcastStatus.details
                                                : JSON.stringify(broadcastStatus.details, null, 2)}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
                                <input
                                    value={broadcastSubject}
                                    onChange={(e) => setBroadcastSubject(e.target.value)}
                                    placeholder="e.g. New Feature Announcement!"
                                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">Message Content</label>
                                <textarea
                                    value={broadcastContent}
                                    onChange={(e) => setBroadcastContent(e.target.value)}
                                    placeholder="Write your message here... Note: It will be preceded by 'Hey [User],'"
                                    className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary h-64 resize-none"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-2">
                                    This will be sent to <strong>{users.filter(u => !u.isBlacklisted).length}</strong> active users via Resend Batch API.
                                </p>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsBroadcastModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isBroadcasting}
                                    className="flex-[2] px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {isBroadcasting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Sending...
                                        </>
                                    ) : (
                                        'Send Broadcast'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
