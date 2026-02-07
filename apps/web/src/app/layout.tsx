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
                import {Background} from "@/components/layout/Background";

                // ... inside RootLayout return ...
                <Providers>
                    <InitialLoader />
                    <Background />

                    <div className="min-h-screen bg-transparent text-foreground flex flex-col relative z-10">
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

