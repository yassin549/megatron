
import { LocalSentinel } from '../../../../packages/lib-integrations/src/local-sentinel';

async function test() {
    console.log('--- Testing Local Sentinel ---');

    // Mock Data
    const mockResults = [
        {
            title: "Bitcoin Surges to New Highs",
            snippet: "Bitcoin price rallies above $70,000 as institutional demand grows. Analysts predict further gains.",
            link: "https://example.com/btc-rally"
        },
        {
            title: "Market Analysis",
            snippet: "Crypto markets are showing strong momentum today with major altcoins following Bitcoin's lead.",
            link: "https://example.com/market-analysis"
        }
    ];

    console.log('Mock Data:', mockResults);

    try {
        console.log('Initializing (Tiny Mode)...');
        // Force init
        await LocalSentinel.init('tiny');

        console.log('Running Analysis...');
        const start = Date.now();
        const result = await LocalSentinel.analyze(mockResults);
        const duration = Date.now() - start;

        console.log('--- Result ---');
        console.log(JSON.stringify(result, null, 2));
        console.log(`Duration: ${duration}ms`);

        if (result.delta_percent && result.summary) {
            console.log('✅ Test Passed: Valid JSON output');
        } else {
            console.error('❌ Test Failed: Invalid output structure');
            process.exit(1);
        }

    } catch (error) {
        console.error('Test Error:', error);
        process.exit(1);
    }
}

test();
