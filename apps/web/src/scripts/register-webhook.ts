
import { turnkeyClient, TURNKEY_CONFIG, pollActivity } from '../lib/turnkey';

const webhookUrl = process.argv[2];

if (!webhookUrl) {
    console.error("❌ Error: Missing Webhook URL");
    console.error("Usage: npx tsx apps/web/src/scripts/register-webhook.ts <YOUR_WEBHOOK_URL>");
    console.error("Example: npx tsx apps/web/src/scripts/register-webhook.ts https://megatron.vercel.app/api/webhooks/turnkey");
    process.exit(1);
}

async function main() {
    console.log(`🔌 Configuring Turnkey Webhook...`);
    console.log(`   URL: ${webhookUrl}`);
    console.log(`   Org ID: ${TURNKEY_CONFIG.organizationId}`);

    try {
        // @ts-ignore - The SDK types might lag behind the API features sometimes, suppressing potential type mismatch for FEATURE_NAME_WEBHOOK if strictly typed enum
        const response = await turnkeyClient.setOrganizationFeature({
            type: "ACTIVITY_TYPE_SET_ORGANIZATION_FEATURE",
            organizationId: TURNKEY_CONFIG.organizationId,
            timestampMs: String(Date.now()),
            parameters: {
                name: "FEATURE_NAME_WEBHOOK",
                value: webhookUrl
            }
        });

        console.log('DEBUG: Full Response:', JSON.stringify(response, null, 2));

        // @ts-ignore
        const activityId = response.activity?.id || response.activityId || response.id;

        if (!activityId) {
            console.error('❌ Error: No Activity ID returned in response');
            process.exit(1);
        }

        console.log(`📝 Activity Submitted: ${activityId}`);
        console.log(`⏳ Waiting for confirmation...`);

        await pollActivity(activityId, TURNKEY_CONFIG.organizationId);

        console.log(`✅ Webhook Registered Successfully!`);
        console.log(`   Turnkey will now send events to: ${webhookUrl}`);

    } catch (error: any) {
        console.error("❌ Failed to register webhook:", error);
        // Clean error logging
        if (error.message) console.error("   Reason:", error.message);
        process.exit(1);
    }
}

main();
