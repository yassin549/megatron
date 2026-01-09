import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import { Toast, ToastType } from '@/components/ui/Toast';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

interface Notification {
    id: string;
    type: ToastType;
    message: string;
}

interface ConfirmOptions {
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
}

interface NotificationContextType {
    showNotification: (type: ToastType, message: string) => void;
    showConfirm: (options: ConfirmOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    const showNotification = useCallback((type: ToastType, message: string) => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, type, message }]);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 5000);
    }, []);

    const removeNotification = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const showConfirm = useCallback((options: ConfirmOptions) => {
        setConfirmOptions(options);
    }, []);

    const handleConfirm = () => {
        if (confirmOptions) {
            confirmOptions.onConfirm();
            setConfirmOptions(null);
        }
    };

    const handleCancel = () => {
        if (confirmOptions) {
            confirmOptions.onCancel?.();
            setConfirmOptions(null);
        }
    };

    return (
        <NotificationContext.Provider value={{ showNotification, showConfirm }}>
            {children}

            {mounted && createPortal(
                <>
                    {/* Toast Container - Moved below navbar and pushed z-index higher */}
                    <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-3 pointer-events-none items-end">
                        <AnimatePresence>
                            {notifications.map((n) => (
                                <Toast
                                    key={n.id}
                                    type={n.type}
                                    message={n.message}
                                    onClose={() => removeNotification(n.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Confirm Modal */}
                    <AnimatePresence>
                        {confirmOptions && (
                            <ConfirmModal
                                message={confirmOptions.message}
                                confirmText={confirmOptions.confirmText}
                                cancelText={confirmOptions.cancelText}
                                onConfirm={handleConfirm}
                                onCancel={handleCancel}
                            />
                        )}
                    </AnimatePresence>
                </>,
                document.body
            )}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
