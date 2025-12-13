import Ably from 'ably';

const ABLY_KEY = process.env.ABLY_API_KEY;

let ablyInstance: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
    if (!ablyInstance) {
        if (!ABLY_KEY) {
            throw new Error('ABLY_API_KEY is not defined');
        }
        ablyInstance = new Ably.Realtime(ABLY_KEY);
    }
    return ablyInstance;
}

export async function publishEvent(channelName: string, eventName: string, data: any): Promise<void> {
    const client = getAblyClient();
    const channel = client.channels.get(channelName);
    await channel.publish(eventName, data);
}
