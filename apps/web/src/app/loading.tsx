import { AssetGridSkeleton } from "@/components/assets/AssetSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
    return (
        <div className="min-h-screen bg-surface relative">
            {/* Background Effects matching actual page */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 relative z-10">
                {/* Hero Skeleton with shimmer */}
                <Skeleton className="mb-8 md:mb-16 h-[400px] rounded-3xl" />

                <AssetGridSkeleton />
            </div>
        </div>
    );
}
