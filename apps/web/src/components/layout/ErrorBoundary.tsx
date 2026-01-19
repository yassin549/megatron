'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`ErrorBoundary [${this.props.name || 'Generic'}]:`, error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-4 opacity-50" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">
                        Component_Failure
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-tight max-w-[200px] mb-4">
                        An unexpected error occurred in {this.props.name || 'this component'}.
                    </p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                        <RefreshCcw className="w-3 h-3" />
                        Attempt_Recovery
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
