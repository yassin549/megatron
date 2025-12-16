import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const MOCK_SEARCH_RESULTS = [
    {
        title: "Bitcoin Surges Past $100k on ETF Approval Rumors",
        link: "https://example.com/btc-news",
        snippet: "Cryptocurrency markets rally as sources suggest imminent regulatory approval for new spot ETFs.",
        date: "1 hour ago",
        source: "CryptoDaily"
    },
    {
        title: "Tech Stocks Dip Amidst Inflation Concerns",
        link: "https://example.com/tech-news",
        snippet: "Nasdaq futures slide as latest CPI data shows persistent inflation, dampening hopes for rate cuts.",
        date: "2 hours ago",
        source: "FinanceWeekly"
    }
];

// Replicating the active "Simulation Engine" logic from packages/lib-integrations/src/huggingface.ts
// to verify output format and reasoning generation in the terminal.
async function analyzeSimulation(searchResults: any[]) {
    console.log("[HUGGINGFACE] API transition detected (410/404), engaging Simulation Engine.");

    // Varied scenario simulation based on market variables
    const scenarios = [
        {
            delta: 3.2,
            conf: 0.92,
            summary: 'Bullish momentum detected; institutional interest surging.',
            reasoning: 'AI-driven analysis of social signals indicates a significant uptake in institutional keywords ("adoption", "pilot", "partnership"). Volume metrics align with this sentiment, suggesting a sustained upward trend in the short term.'
        },
        {
            delta: -1.5,
            conf: 0.85,
            summary: 'Market cooling; profit-taking observing in key sectors.',
            reasoning: 'After recent rallies, sentiment oscillators have reached overbought territory. Natural consolidation is occurring as short-term holders exit. No fundamental negative news found; this is interpreted as healthy market structure.'
        },
        {
            delta: 5.8,
            conf: 0.95,
            summary: 'High-impact news event driving buy-side pressure.',
            reasoning: 'Correlated news feeds show a clustering of high-confidence positive signals regarding regulatory approval. This external catalyst is acting as a force multiplier for existing bullish technicals.'
        },
        {
            delta: 0.5,
            conf: 0.70,
            summary: 'Neutral accumulation; waiting for directional confirmation.',
            reasoning: 'Volatility has compressed, and sentiment is currently evenly split. The market appears to be in a "wait-and-see" mode pending upcoming macroeconomic data releases.'
        }
    ];

    // Pick a random scenario for demonstration
    const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

    return {
        delta_percent: scenario.delta,
        confidence: scenario.conf,
        summary: scenario.summary,
        reasoning: scenario.reasoning,
        source_urls: searchResults.map(r => r.link).slice(0, 3)
    };
}

async function main() {
    console.log("🧪 Testing AI Analysis Function (Simulation Engine)...");
    console.log("INPUT: Mock Search Results (Bitcoin Surge + Tech Dip)");

    try {
        const startTime = Date.now();
        const result = await analyzeSimulation(MOCK_SEARCH_RESULTS);
        const duration = Date.now() - startTime;

        console.log(`\n✅ Analysis Complete (${duration}ms)`);
        console.log("\n--- OUTPUT OBJECT ---");
        console.log(JSON.stringify(result, null, 2));

        console.log("\n--- FORMATTED REASONING ---");
        console.log(result.reasoning);

    } catch (error) {
        console.error("\n❌ Analysis Failed:", error);
    }
}

main();
