"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAblyClient = getAblyClient;
exports.publishEvent = publishEvent;
const ably_1 = __importDefault(require("ably"));
const ABLY_KEY = process.env.ABLY_API_KEY;
let ablyInstance = null;
function getAblyClient() {
    if (!ablyInstance) {
        if (!ABLY_KEY) {
            throw new Error('ABLY_API_KEY is not defined');
        }
        ablyInstance = new ably_1.default.Realtime(ABLY_KEY);
    }
    return ablyInstance;
}
async function publishEvent(channelName, eventName, data) {
    const client = getAblyClient();
    const channel = client.channels.get(channelName);
    await channel.publish(eventName, data);
}
