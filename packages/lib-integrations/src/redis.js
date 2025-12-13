"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.closeRedis = closeRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const REDIS_URL = process.env.UPSTASH_REDIS_URL || process.env.UPSTASH_REST_URL;
// Singleton Redis client
let redisClient = null;
function getRedisClient() {
    if (!redisClient) {
        if (!REDIS_URL) {
            console.warn('Redis URL not found, using localhost default');
        }
        redisClient = new ioredis_1.default(REDIS_URL || 'redis://localhost:6379');
        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
    }
    return redisClient;
}
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
    }
}
