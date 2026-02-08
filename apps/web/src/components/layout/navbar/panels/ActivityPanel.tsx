'use client';

import { History, Activity } from 'lucide-react';

interface ActivityPanelProps {
    assetCount?: number | null;
}

/**
 * Activity panel showing system status and recent events.
 */
export function ActivityPanel({ assetCount }: ActivityPanelProps) {
    return (
        <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <History className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white">System Status</h4>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                            The Neural Engine is currently analyzing {assetCount ? assetCount.toLocaleString() : '2,400'} world variables in real-time.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Recent events</h5>
                <div className="py-12 text-center flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center mb-3">
                        <Activity className="w-5 h-5 text-zinc-800" />
                    </div>
                    <p className="text-[11px] text-zinc-600 uppercase tracking-wider">Passive mode active</p>
                </div>
            </div>
        </div>
    );
}
