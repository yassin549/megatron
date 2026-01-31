import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { InitialLoader } from "@/components/ui/InitialLoader";
import { RequestMarketButton } from "@/components/RequestMarketButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Megatron | LP-Funded Synthetic Assets",
    description: "Trade synthetic assets backed by liquidity pools",
    icons: {
        icon: "/images/megatron-logo.jpg",
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={inter.className}>
                <Providers>
                    <InitialLoader />
                    {/* Global Background Effects */}
                    <div className="fixed inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none z-0" />
                    <div className="fixed inset-0 bg-[radial-gradient(circle_800px_at_50%_-20%,_rgba(59,130,246,0.15),transparent)] pointer-events-none z-0" />

                    <div className="min-h-screen text-foreground flex flex-col relative z-10">
                        <Navbar />
                        <div className="flex-1 pb-28 md:pb-0">
                            {children}
                        </div>
                        <MobileBottomNav />
                        <RequestMarketButton />
                    </div>
                    <Analytics />
                    <SpeedInsights />
                </Providers>
            </body>
        </html>
    );
}

