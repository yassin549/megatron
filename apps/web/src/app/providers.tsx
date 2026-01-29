'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { NotificationProvider } from '@/context/NotificationContext';
import * as ThemeContext from '@/context/ThemeContext';

interface ProvidersProps {
    children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
    return (
        <SessionProvider>
            <ThemeContext.ThemeProvider>
                <NotificationProvider>
                    {children}
                </NotificationProvider>
            </ThemeContext.ThemeProvider>
        </SessionProvider>
    );
}
