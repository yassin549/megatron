'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

interface MobilePageHeaderProps {
    title: string;
    description?: string;
    onBack?: () => void;
    action?: ReactNode;
    className?: string;
}

export function MobilePageHeader({ title, description, onBack, action, className = '' }: MobilePageHeaderProps) {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <div className={`sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50 px-4 py-3 ${className}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {onBack !== undefined && ( // Only show if explicitly passed or implied? actually let's just make it simpler
                        <button
                            onClick={handleBack}
                            className="p-2 -ml-2 rounded-full hover:bg-white/5 active:bg-white/10 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-foreground" />
                        </button>
                    )}
                    <div>
                        <h1 className="text-lg font-bold text-foreground leading-tight">{title}</h1>
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                </div>
                {action && (
                    <div className="flex-shrink-0">
                        {action}
                    </div>
                )}
            </div>
        </div>
    );
}
