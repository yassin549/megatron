'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface MobileListRowProps {
    label: string;
    subLabel?: string;
    value?: ReactNode;
    subValue?: ReactNode;
    icon?: ReactNode;
    onClick?: () => void;
    className?: string;
}

export function MobileListRow({ label, subLabel, value, subValue, icon, onClick, className = '' }: MobileListRowProps) {
    const Content = (
        <div className={`flex items-center justify-between p-4 bg-card/40 backdrop-blur-sm border border-border/40 rounded-xl ${onClick ? 'active:scale-[0.98] active:bg-card/60' : ''} transition-all ${className}`}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center text-foreground">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="font-semibold text-foreground text-sm">{label}</h3>
                    {subLabel && <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>}
                </div>
            </div>

            <div className="flex items-center gap-3 text-right">
                {(value || subValue) && (
                    <div>
                        {value && <div className="font-bold text-foreground text-sm">{value}</div>}
                        {subValue && <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>}
                    </div>
                )}
                {onClick && <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
            </div>
        </div>
    );

    if (onClick) {
        return (
            <motion.div
                whileTap={{ scale: 0.98 }}
                onClick={onClick}
                className="cursor-pointer"
            >
                {Content}
            </motion.div>
        );
    }

    return Content;
}
