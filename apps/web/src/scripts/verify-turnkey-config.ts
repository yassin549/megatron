
import { turnkeyClient, TURNKEY_CONFIG } from '../lib/turnkey';

async function main() {
    console.log('Verifying Turnkey Configuration...');
    console.log(`Organization ID: ${TURNKEY_CONFIG.organizationId}`);

    try {
        const response = await turnkeyClient.getWhoami({
            organizationId: TURNKEY_CONFIG.organizationId
        });

        console.log('✅ Connection Successful');
        console.log('WhoAmI Response:', JSON.stringify(response, null, 2));

    } catch (error: any) {
        console.error('❌ Verification Failed:', error);
        process.exit(1);
    }
}

main();
