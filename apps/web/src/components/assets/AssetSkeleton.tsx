import { motion } from 'framer-motion';

export function AssetSkeleton() {
    return (
        <div className="bg-elevated/50 backdrop-blur-md border border-border-subtle rounded-xl p-3 h-full animate-pulse">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl bg-surface/50" />
                <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 bg-surface rounded" />
                    <div className="h-3 w-1/4 bg-surface/50 rounded" />
                </div>
            </div>

            {/* Metrics */}
            <div className="mt-auto space-y-4">
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <div className="h-8 w-24 bg-surface rounded" />
                        <div className="h-4 w-12 bg-surface/50 rounded" />
                    </div>
                    <div className="h-12 w-32 bg-surface/30 rounded-lg" />
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-border-subtle flex justify-between items-center">
                    <div className="h-4 w-1/2 bg-surface/50 rounded" />
                    <div className="h-6 w-6 bg-surface/50 rounded" />
                </div>
            </div>
        </div>
    );
}

export function AssetGridSkeleton() {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3.5">
            {[...Array(8)].map((_, i) => (
                <AssetSkeleton key={i} />
            ))}
        </div>
    );
}
