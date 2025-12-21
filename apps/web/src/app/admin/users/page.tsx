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
                                            <button className="text-sm text-primary hover:underline mr-4">
                                                View
                                            </button>
                                            {!user.isAdmin && (
                                                <button className={`text-sm hover:underline ${user.isBlacklisted ? 'text-green-500' : 'text-red-500'
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
        </div>
    );
}
