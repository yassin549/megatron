import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/layout/Navbar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { InitialLoader } from "@/components/ui/InitialLoader";

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
                    <div className="min-h-screen bg-background text-foreground">
                        <Navbar />
                        {children}
                        <MobileBottomNav />
                    </div>
                    <Analytics />
                </Providers>
            </body>
        </html>
    );
}

