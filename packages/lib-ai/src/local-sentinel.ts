import type { SearchResult } from '@megatron/lib-integrations';
import type { LLMOutput } from '@megatron/lib-common';
import { env, pipeline } from '@huggingface/transformers';

// Configure transformers to use local cache
env.cacheDir = './.cache';

export type LocalModelSize = 'standard' | 'small' | 'tiny';

export class LocalSentinel {
    private static sentimentPipeline: any = null;
    private static analysisPipeline: any = null;
    private static modelSize: LocalModelSize = 'tiny'; // Default to safest for free tier

    /**
     * Initialize pipelines if not already loaded.
     * @param size - The size of the model to use for the analysis stage.
     */
    static async init(size: LocalModelSize = 'tiny'): Promise<void> {
        this.modelSize = size;

        if (!this.sentimentPipeline) {
            console.log('[LOCAL_SENTINEL] Loading Stage 1: Sentiment Analysis Model...');
            this.sentimentPipeline = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
        }

        if (!this.analysisPipeline) {
            console.log(`[LOCAL_SENTINEL] Loading Stage 2: Deep Analysis Model (${size})...`);

            let modelId = 'Xenova/LaMini-Flan-T5-77M'; // Tiny default
            if (size === 'small') modelId = 'Xenova/LaMini-Flan-T5-248M';
            if (size === 'standard') modelId = 'Xenova/Qwen1.5-0.5B-Chat';

            // Use 'text2text-generation' for T5, 'text-generation' for Qwen/Chat models
            const task = size === 'standard' ? 'text-generation' : 'text2text-generation';

            this.analysisPipeline = await pipeline(task, modelId, {
                quantized: true,
            } as any);
        }
    }

    /**
     * Main entry point: Analyze search results using the Dual-Stage Sentinel system.
     */
    static async analyze(searchResults: SearchResult[]): Promise<LLMOutput> {
        // Ensure initialized
        if (!this.sentimentPipeline || !this.analysisPipeline) {
            await this.init(process.env.LOCAL_MODEL_SIZE as LocalModelSize || 'tiny');
        }

        const snippets = searchResults.map(r => r.snippet).filter(s => s && s.length > 10);

        if (snippets.length === 0) {
            throw new Error('No valid snippets to analyze');
        }

        // --- STAGE 1: SENTIMENT FILTER ---
        const impact = await this.assessImpact(snippets);
        console.log(`[LOCAL_SENTINEL] Impact Score: ${impact.score} (${impact.sentiment})`);

        // If low impact, skip heavy model and use template
        if (impact.score < 75) {
            console.log('[LOCAL_SENTINEL] Low impact detected. Using diverse template response.');
            return this.generateTemplateResponse(searchResults, impact);
        }

        // --- STAGE 2: DEEP ANALYSIS ---
        console.log('[LOCAL_SENTINEL] High impact detected! Engaging Deep Analysis Model...');
        return this.generateDeepAnalysis(searchResults, impact);
    }

    private static async assessImpact(snippets: string[]): Promise<{ score: number, sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' }> {
        // We'll analyze the first 5 snippets
        const toAnalyze = snippets.slice(0, 5);
        let totalScore = 0;
        let positiveCount = 0;
        let negativeCount = 0;

        for (const snippet of toAnalyze) {
            const result = await (this.sentimentPipeline as any)(snippet) as any;
            // Xenova/distilbert-sst-2 returns [{ label: 'POSITIVE', score: 0.99 }]
            const label = result[0].label;
            const score = result[0].score;

            if (label === 'POSITIVE') positiveCount++;
            if (label === 'NEGATIVE') negativeCount++;

            // Impact is higher if confidence is high
            totalScore += score;
        }

        const avgConfidence = totalScore / toAnalyze.length;

        // Impact Logic:
        // 1. Unanimous sentiment (all positive or all negative) = High Impact
        // 2. High average confidence (> 0.9) = High Impact
        // 3. Keywords check (Flash Crash, Surge, Plunge, SEC, Lawsuit)

        const isUnanimous = positiveCount === toAnalyze.length || negativeCount === toAnalyze.length;
        const keywords = ['surge', 'plunge', 'crash', 'rally', 'lawsuit', 'sec', 'breakout', 'record'];
        const hasKeywords = snippets.some(s => keywords.some(k => s.toLowerCase().includes(k)));

        let impactScore = avgConfidence * 50; // Base 0-50
        if (isUnanimous) impactScore += 30;
        if (hasKeywords) impactScore += 25; // Can boost over 100, capped at 100 later

        // Determine dominant sentiment
        let sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL';
        if (positiveCount > negativeCount) sentiment = 'POSITIVE';
        if (negativeCount > positiveCount) sentiment = 'NEGATIVE';

        return {
            score: Math.min(100, Math.round(impactScore)),
            sentiment
        };
    }

    private static generateTemplateResponse(results: SearchResult[], impact: { score: number, sentiment: string }): LLMOutput {
        const isBullish = impact.sentiment === 'POSITIVE';

        // Less dramatic delta for low impact
        const delta = isBullish ? (1.2 + Math.random()) : (-1.2 - Math.random());

        return {
            delta_percent: Number(delta.toFixed(2)),
            confidence: 0.75 + (impact.score / 200), // 0.75 - ~0.95
            summary: `Market consolidating with ${isBullish ? 'mild positive' : 'mild negative'} bias.`,
            reasoning: `Routine market analysis indicates a stabilization phase. Sentiment analysis of recent news suggests ${isBullish ? 'optimism' : 'caution'} but lacks high-impact catalysts to drive significant volatility at this moment.`,
            source_urls: results.map(r => r.link).slice(0, 3)
        };
    }

    private static async generateDeepAnalysis(results: SearchResult[], impact: { score: number, sentiment: string }): Promise<LLMOutput> {
        // Construct Prompt
        const context = results.slice(0, 3).map(r => `- ${r.title}: ${r.snippet}`).join('\n');

        const systemPrompt = `Analyze these crypto market news and output a valid JSON.
         Context:
         ${context}
         
         Requirements:
         - Output JSON ONLY.
         - Fields: delta_percent (number), confidence (0.0-1.0), summary (string), reasoning (string).
         - Reasoning must be professional and cite the specific news events.`;

        // Handle Model Differences
        let outputText = '';

        if (this.modelSize === 'standard') {
            // Chat-style prompt for Qwen
            const messages = [
                { role: 'system', content: 'You are a financial analyst. Output valid JSON only.' },
                { role: 'user', content: systemPrompt }
            ];
            const output = await (this.analysisPipeline as any)(messages, { max_new_tokens: 200 });
            outputText = output[0].generated_text;
        } else {
            // Seq2Seq prompt for T5
            // T5 handles raw text better than chat structure
            const t5Prompt = `generate JSON financial analysis based on: ${context}`;
            const output = await (this.analysisPipeline as any)(t5Prompt, { max_new_tokens: 200 });
            outputText = output[0].generated_text;
        }

        // Parse JSON
        try {
            const json = this.parseJsonLoose(outputText);
            if (json) {
                // Ensure array for source_urls
                if (!json.source_urls) json.source_urls = results.map(r => r.link).slice(0, 3);
                return json;
            }
        } catch (e) {
            console.warn('[LOCAL_SENTINEL] JSON parse failed, falling back to template.', e);
        }

        // Fallback if model fails to output valid JSON
        return this.generateTemplateResponse(results, impact);
    }

    private static parseJsonLoose(text: string): any {
        try {
            // 1. Try direct parse
            return JSON.parse(text);
        } catch { }

        try {
            // 2. Extract json markdown code block
            const match = text.match(/```json([\s\S]*?)```/);
            if (match) return JSON.parse(match[1]);
        } catch { }

        try {
            // 3. Find first { and last }
            const start = text.indexOf('{');
            const end = text.lastIndexOf('}');
            if (start !== -1 && end !== -1) {
                return JSON.parse(text.substring(start, end + 1));
            }
        } catch { }

        return null;
    }
}
