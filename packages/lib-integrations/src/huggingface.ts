import type { LLMOutput } from '@megatron/lib-common';
import type { SearchResult } from './serper';

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
            console.warn(`[HUGGINGFACE] Retry ${i + 1}/${retries} failed:`, err.message);
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (i + 1)));
            }
        }
    }
    throw lastError;
}

export async function analyzeLLM(searchResults: SearchResult[]): Promise<LLMOutput> {
    // FIX #7: Read env vars at call time, not module load time
    const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
    const HUGGINGFACE_API_URL = process.env.HUGGINGFACE_API_URL || 'https://api-inference.huggingface.co/models/';

    if (!HUGGINGFACE_API_KEY) {
        throw new Error('HUGGINGFACE_API_KEY is not defined');
    }

    const context = searchResults
        .map(r => `${r.title}\n${r.snippet}\nSource: ${r.link}`)
        .join('\n\n');

    const prompt = `Analyze the following news articles and determine the impact on the asset price.\nReturn a JSON object with these fields:\n- delta_percent: number (percentage change, can be negative)\n- confidence: number (0 to 1, how confident you are)\n- summary: string (one sentence explaining the impact)\n- source_urls: array of relevant URLs\n\nContext:\n${context}\n\nJSON:`;

    // FIX #8: Wrap in retry logic
    const response = await withRetry(() =>
        fetch(
            `${HUGGINGFACE_API_URL.replace(/\/$/, '')}/google/flan-t5-base`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    inputs: prompt,
                    parameters: {
                        max_new_tokens: 200,
                        temperature: 0.3,
                    },
                }),
            },
        )
    );

    if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const generated = Array.isArray(data) && data[0] && typeof data[0].generated_text === 'string'
        ? data[0].generated_text
        : '';

    if (!generated) {
        throw new Error('HuggingFace response missing generated_text');
    }

    // Fuzzy JSON extraction - handles markdown blocks, embedded JSON, etc.
    function extractJson(text: string): any {
        // Try direct parse first
        try { return JSON.parse(text); } catch { }

        // Extract from markdown code blocks: ```json ... ``` or ``` ... ```
        const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeMatch) {
            try { return JSON.parse(codeMatch[1].trim()); } catch { }
        }

        // Extract first {...} block
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try { return JSON.parse(jsonMatch[0]); } catch { }
        }

        throw new Error('Could not extract valid JSON from LLM response');
    }

    try {
        const parsed = extractJson(generated) as LLMOutput;
        return parsed;
    } catch (e) {
        throw new Error('LLM did not return valid JSON');
    }
}
