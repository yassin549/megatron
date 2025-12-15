"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.querySerper = querySerper;
// FIX #6: Read env var inside function, not at module load time
// FIX #8: Add retry logic with exponential backoff
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
async function withRetry(fn, retries = MAX_RETRIES) {
    let lastError = null;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            console.warn(`[SERPER] Retry ${i + 1}/${retries} failed:`, err.message);
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
            }
        }
    }
    throw lastError;
}
async function querySerper(queries) {
    // FIX #6: Read at call time, not module load time
    const SERPER_API_KEY = process.env.SERPER_API_KEY;
    if (!SERPER_API_KEY) {
        throw new Error('SERPER_API_KEY is not defined');
    }
    const results = [];
    for (const query of queries) {
        // FIX #8: Wrap in retry logic
        const response = await withRetry(() => fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: query,
                num: 5,
            }),
        }));
        if (!response.ok) {
            throw new Error(`Serper API error: ${response.status}`);
        }
        const data = await response.json();
        const organic = Array.isArray(data.organic) ? data.organic : [];
        for (const item of organic.slice(0, 5)) {
            if (item && typeof item.title === 'string' && typeof item.snippet === 'string' && typeof item.link === 'string') {
                results.push({
                    title: item.title,
                    snippet: item.snippet,
                    link: item.link,
                });
            }
        }
    }
    return results;
}
