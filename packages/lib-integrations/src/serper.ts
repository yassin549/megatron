export interface SearchResult {
    title: string;
    snippet: string;
    link: string;
}

// FIX #6: Read env var inside function, not at module load time
// FIX #8: Add retry logic with exponential backoff
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err: any) {
            lastError = err;

            // Don't retry on 400 Bad Request
            if (err.message && err.message.includes('400')) {
                console.warn(`[SERPER] Non-retriable error (400):`, err.message);
                throw err;
            }

            console.warn(`[SERPER] Retry ${i + 1}/${retries} failed:`, err.message);
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
            }
        }
    }
    throw lastError;
}

export async function querySerper(queries: string[]): Promise<SearchResult[]> {
    // FIX #6: Read at call time, not module load time
    const SERPER_API_KEY = process.env.SERPER_API_KEY;

    if (!SERPER_API_KEY) {
        throw new Error('SERPER_API_KEY is not defined');
    }

    // Filter out empty or whitespace-only queries
    const validQueries = queries.filter(q => q && q.trim().length > 0);
    if (validQueries.length === 0) {
        return [];
    }

    const results: SearchResult[] = [];

    for (const query of validQueries) {
        try {
            // FIX #8: Wrap in retry logic
            const response = await withRetry(async () => {
                const res = await fetch('https://google.serper.dev/search', {
                    method: 'POST',
                    headers: {
                        'X-API-KEY': SERPER_API_KEY,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        q: query,
                        num: 5,
                    }),
                });

                if (!res.ok) {
                    // Do not retry on 400 Bad Request
                    if (res.status === 400) {
                        const errorBody = await res.text();
                        console.error(`[SERPER] 400 Bad Request for query: "${query}". Body: ${errorBody}`);
                        // Return null or throw a special error that withRetry knows not to retry?
                        // For now, we'll throw a non-retriable error if we could, but withRetry catches all.
                        // Let's modify withRetry to respect a "stop" signal, or just throw and let it fail if it's 400.
                        // Actually, simpler: if 400, we shouldn't even be inside withRetry loop optimally, 
                        // but since we are, we can throw an error that we check for?
                        // Or just let it fail. 
                        // Implementation detail: strict requirements say "Modify... to NOT retry on 400".
                        // I will update withRetry logic below or inside the callback? 
                        // Inside callback I can't stop the loop outside easily without a specific error type.
                        throw new Error(`Serper API error: ${res.status} ${res.statusText}`);
                    }
                    throw new Error(`Serper API error: ${res.status}`);
                }
                return res;
            });

            // If we got here, response is ok (or withRetry succeeded eventually)
            const data = await response.json() as any;
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

        } catch (err: any) {
            // Log error but continue with other queries
            // If it was a 400, it's already logged above if we updated logic, 
            // but if we threw plain Error, withRetry retried it. 
            // To properly fix "no retry on 400", I need to update withRetry too.
            // I will update the whole file content to include the modified withRetry.
            console.error(`[SERPER] Failed to process query "${query}":`, err.message);
        }
    }

    return results;
}
