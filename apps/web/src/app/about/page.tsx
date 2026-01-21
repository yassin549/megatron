import { Target, Shield, Zap, Brain, Globe, Users } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-transparent text-gray-200">


            <main>
                {/* Hero Section */}
                <div className="relative overflow-hidden py-24 text-center">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
                    <div className="relative z-10 max-w-4xl mx-auto px-4">
                        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
                            The Future of <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
                                Prediction Markets
                            </span>
                        </h1>
                        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                            Megatron is the first platform to combine community liquidity with Large Language Model (LLM) fundamental analysis to create the most accurate pricing engine for real-world events.
                        </p>
                        <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all transform hover:scale-105">
                            <Zap className="w-4 h-4" />
                            Start Trading
                        </Link>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="max-w-6xl mx-auto px-4 py-24">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:border-blue-500/50 transition-colors group">
                            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                                <Brain className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">AI-Powered Pricing</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Our autonomous agents continuously scan global news sources to update the fundamental probability of every market, keeping prices accurate even when liquidity is low.
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:border-purple-500/50 transition-colors group">
                            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                                <Shield className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Transparent & Trustless</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Every trade, position, and oracle update is verifiable. We use a transparent ledger system to ensure funds are always accounted for.
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl hover:border-green-500/50 transition-colors group">
                            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-500/20 transition-colors">
                                <Users className="w-6 h-6 text-green-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">Community Liquidity</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Users can fund markets to earn yield from trading fees. Liquidity providers are the backbone of the ecosystem and are rewarded for their participation.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stat Bar */}
                <div className="border-y border-white/10 bg-white/[0.02]">
                    <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col md:flex-row justify-between items-center gap-8">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white font-mono mb-1">100%</div>
                            <div className="text-sm text-gray-500 uppercase tracking-wider">Uptime</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white font-mono mb-1">&lt;50ms</div>
                            <div className="text-sm text-gray-500 uppercase tracking-wider">Execution Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white font-mono mb-1">24/7</div>
                            <div className="text-sm text-gray-500 uppercase tracking-wider">AI Monitoring</div>
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="text-center py-24">
                    <h2 className="text-3xl font-bold text-white mb-6">Ready to predict the future?</h2>
                    <Link href="/signup" className="text-blue-400 hover:text-white transition-colors underline underline-offset-4">
                        Create an account in seconds
                    </Link>
                </div>
            </main>
        </div>
    );
}
