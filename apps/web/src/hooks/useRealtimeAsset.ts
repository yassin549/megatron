'use client';

import { useEffect, useState } from 'react';
import Ably from 'ably';

let ablyClient: Ably.Realtime | null = null;

/**
 * Hook to subscribe to real-time price and pressure updates for a specific asset.
 * Uses a singleton Ably client to manage connections.
 */
export function useRealtimeAsset(assetId: string, initialPrice: number, initialPressure: number) {
    const [price, setPrice] = useState(initialPrice);
    const [pressure, setPressure] = useState(initialPressure);

    useEffect(() => {
        // Initialize Ably client if it doesn't exist (singleton)
        if (!ablyClient) {
            ablyClient = new Ably.Realtime({
                authUrl: '/api/realtime/token',
            });
        }

        const channel = ablyClient.channels.get(`prices:${assetId}`);

        const onTick = (message: any) => {
            if (message.data.priceDisplay !== undefined) {
                setPrice(Number(message.data.priceDisplay));
            }
            if (message.data.pressure !== undefined) {
                setPressure(Number(message.data.pressure));
            }
        };

        // Subscribe to price_tick events published by the worker
        channel.subscribe('price_tick', onTick);

        return () => {
            // Cleanup subscription on unmount
            channel.unsubscribe('price_tick', onTick);
        };
    }, [assetId]);

    // Update state if initial values change (e.g. on navigation)
    useEffect(() => {
        setPrice(initialPrice);
        setPressure(initialPressure);
    }, [initialPrice, initialPressure]);

    return { price, pressure };
}
