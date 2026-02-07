import { AssetGridSkeleton } from "@/components/assets/AssetSkeleton";
import { SubNavbar } from "@/components/layout/SubNavbar";

export default function Loading() {
    return (
        <div className="min-h-screen bg-surface relative">
            {/* Background Effects matching actual page */}
            <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* We don't show the SubNavbar here because it's in the layout, but if we wanted custom shell... */}
            {/* Actually, RootLayout already has Navbar and SubNavbar? No, SubNavbar is in page.tsx */}

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8 relative z-10">
                {/* Hero Skeleton (Optional, but good for CLS) */}
                <div className="mb-8 md:mb-16 h-[400px] bg-elevated/20 rounded-3xl border border-white/5 animate-pulse" />

                <AssetGridSkeleton />
            </div>
        </div>
    );
}
