import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@megatron/database';
import * as bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                const user = await db.user.findUnique({
                    where: { email: credentials.email },
                });

                if (!user) {
                    return null;
                }

                if (user.isBlacklisted) {
                    throw new Error('Account has been suspended');
                }

                const isValid = await bcrypt.compare(
                    credentials.password,
                    user.passwordHash
                );

                if (!isValid) {
                    return null;
                }

                return {
                    id: user.id,
                    email: user.email,
                    isAdmin: user.isAdmin,
                };
            },
        }),
        // Google OAuth (optional - only enabled if env vars are set)
        ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ? [
                GoogleProvider({
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                }),
            ]
            : []),
    ],
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/login',
        error: '/login',
    },
    callbacks: {
        async signIn({ user, account }) {
            // For Google OAuth, create user if doesn't exist
            if (account?.provider === 'google' && user.email) {
                const existingUser = await db.user.findUnique({
                    where: { email: user.email },
                });

                if (!existingUser) {
                    // Create new user from Google OAuth
                    const newUser = await db.user.create({
                        data: {
                            email: user.email,
                            passwordHash: '', // No password for OAuth users
                        },
                    });
                    user.id = newUser.id;
                } else {
                    if (existingUser.isBlacklisted) {
                        return false;
                    }
                    user.id = existingUser.id;
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.isAdmin = (user as any).isAdmin || false;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).isAdmin = token.isAdmin;
            }
            return session;
        },
    },
};
