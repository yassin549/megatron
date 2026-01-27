'use client';

import { useEffect, useState, useCallback } from 'react';
import Ably from 'ably';

let ablyClient: Ably.Realtime | null = null;

interface RealtimeData {
    price: number;
    pressure: number;
    lastTick: any;
    orderbookCounter: number; // Increment this to trigger orderbook re-fetch
}

/**
 * A comprehensive hook for real-time asset data on trading pages.
 * Listens for price ticks and orderbook updates.
 */
export function useRealtimeAssetData(assetId: string, initialPrice: number, initialPressure: number = 50) {
    const [data, setData] = useState<RealtimeData>({
        price: initialPrice,
        pressure: initialPressure,
        lastTick: null,
        orderbookCounter: 0,
    });

    useEffect(() => {
        if (!ablyClient) {
            ablyClient = new Ably.Realtime({
                authUrl: '/api/realtime/token',
            });
        }

        // Subscribing to two channels:
        // 1. prices:${assetId} - For price ticks and pressure
        // 2. assets:${assetId} - For orderbook updates and other asset events
        const priceChannel = ablyClient.channels.get(`prices:${assetId}`);
        const assetChannel = ablyClient.channels.get(`assets:${assetId}`);

        const onPriceTick = (message: any) => {
            setData(prev => ({
                ...prev,
                price: message.data.priceDisplay ?? prev.price,
                pressure: message.data.pressure ?? prev.pressure,
                lastTick: message.data,
            }));
        };

        const onOrderbookUpdate = (message: any) => {
            setData(prev => ({
                ...prev,
                orderbookCounter: prev.orderbookCounter + 1,
            }));
        };

        priceChannel.subscribe('price_tick', onPriceTick);
        assetChannel.subscribe('orderbook_update', onOrderbookUpdate);

        return () => {
            priceChannel.unsubscribe('price_tick', onPriceTick);
            assetChannel.unsubscribe('orderbook_update', onOrderbookUpdate);
        };
    }, [assetId]);

    // Cleanup/Reset on asset change
    useEffect(() => {
        setData({
            price: initialPrice,
            pressure: initialPressure,
            lastTick: null,
            orderbookCounter: 0,
        });
    }, [assetId, initialPrice, initialPressure]);

    return data;
}
