import { Skeleton } from '@/components/ui/Skeleton';

export function AssetSkeleton() {
    return (
        <div className="bg-elevated border border-border-subtle rounded-xl p-3 h-full">
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-12 h-12 md:w-16 md:h-16 rounded-xl" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/4" />
                </div>
            </div>

            {/* Metrics */}
            <div className="mt-auto space-y-4">
                <div className="flex justify-between items-end">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-4 w-12" />
                    </div>
                    <Skeleton className="h-12 w-32 rounded-lg" />
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-border-subtle flex justify-between items-center">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-6 rounded" />
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
