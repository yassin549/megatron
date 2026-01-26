import 'dotenv/config';
import { TurnkeyClient } from "@turnkey/http";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";

// Ensure environment variables are set
const TURNKEY_API_PUBLIC_KEY = process.env.TURNKEY_API_PUBLIC_KEY;
const TURNKEY_API_PRIVATE_KEY = process.env.TURNKEY_API_PRIVATE_KEY;
const TURNKEY_ORGANIZATION_ID = process.env.TURNKEY_ORGANIZATION_ID;

if (!TURNKEY_API_PUBLIC_KEY || !TURNKEY_API_PRIVATE_KEY || !TURNKEY_ORGANIZATION_ID) {
    console.error("Missing Turnkey API keys in environment variables");
}

// Initialize the Turnkey Client
const stamper = new ApiKeyStamper({
    apiPublicKey: TURNKEY_API_PUBLIC_KEY!,
    apiPrivateKey: TURNKEY_API_PRIVATE_KEY!,
});

export const turnkeyClient = new TurnkeyClient(
    { baseUrl: "https://api.turnkey.com" },
    stamper
);

export const TURNKEY_CONFIG = {
    organizationId: TURNKEY_ORGANIZATION_ID!,
};

// Helper: Create a Sub-Organization for a User
export async function createSubOrganization(userId: string) {
    try {
        const subOrgName = `user-${userId}`;

        // We use the root organization to create a sub-org
        const response = await turnkeyClient.createSubOrganization({
            type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7", // Updated to V7
            timestampMs: String(Date.now()),
            organizationId: TURNKEY_CONFIG.organizationId,
            parameters: {
                subOrganizationName: subOrgName,
                rootUsers: [
                    {
                        userName: "Megatron Admin",
                        apiKeys: [{
                            apiKeyName: "Megatron Admin Key",
                            publicKey: TURNKEY_API_PUBLIC_KEY!,
                            curveType: "API_KEY_CURVE_P256" // Required
                        }],
                        authenticators: [],
                        oauthProviders: [],

                    }
                ],
                rootQuorumThreshold: 1,
            },
        });

        const activityId = response.activity?.id || response.activityId;
        const completedActivity = await pollActivity(activityId, TURNKEY_CONFIG.organizationId);

        // Check result structure based on SDK version
        const result = completedActivity.result?.createSubOrganizationResult;
        return result?.subOrganizationId;

    } catch (error) {
        console.error("Failed to create sub-organization:", error);
        throw error;
    }
}

// Helper: Create a Wallet within a Sub-Organization
export async function createWallet(subOrganizationId: string, walletName: string = "Default Wallet") {
    try {
        const response = await turnkeyClient.createWallet({
            type: "ACTIVITY_TYPE_CREATE_WALLET",
            organizationId: subOrganizationId, // Act as the sub-org
            timestampMs: String(Date.now()),
            parameters: {
                walletName,
                accounts: [
                    {
                        curve: "CURVE_SECP256K1",
                        pathFormat: "PATH_FORMAT_BIP32",
                        path: "m/44'/60'/0'/0/0", // Ethereum Standard
                        addressFormat: "ADDRESS_FORMAT_ETHEREUM"
                    }
                ]
            }
        });

        const activityId = response.activity?.id || response.activityId;
        const completed = await pollActivity(activityId, subOrganizationId);
        const result = completed.result?.createWalletResult;

        // Return Wallet ID and the first Address
        return {
            walletId: result?.walletId,
            address: result?.addresses[0]
        };

    } catch (e) {
        console.error("Failed to create wallet:", e);
        throw e;
    }
}

// Helper: Initiate a Transfer (Withdrawal)
export async function initiateTransfer(subOrganizationId: string, walletId: string, toAddress: string, amount: string) {
    try {
        // 1. Create Transaction Activity
        const response = await turnkeyClient.createTransaction({
            type: "ACTIVITY_TYPE_CREATE_TRANSACTION",
            organizationId: subOrganizationId, // Act as the sub-org
            timestampMs: String(Date.now()),
            parameters: {
                type: "TRANSACTION_TYPE_ETHEREUM",
                walletId: walletId,
                unsignedTransaction: {
                    type: "TRANSACTION_TYPE_ETHEREUM",
                    to: toAddress,
                    value: amount, // Wei
                    chainId: "8453", // Base Mainnet (Example) - Should be config
                    data: "0x",
                    nonce: "0", // Turnkey might handle or we need to fetch
                    gasLimit: "21000",
                    maxFeePerGas: "1000000000", // 1 Gwei
                    maxPriorityFeePerGas: "1000000000"
                }
            }
        });

        // 2. Poll for Signature
        const activityId = response.activity?.id || response.activityId;
        const completed = await pollActivity(activityId, subOrganizationId);
        const result = completed.result?.createTransactionResult;

        // 3. Broadcast (Turnkey signs, we/they broadcast)
        // Usually Turnkey returns the signed payload, we broadcast via RPC.
        // For MVP, we presume the result contains `signedTransaction`.
        // Then we would use ethers.js or similar to broadcast.

        return {
            signedTransaction: result?.signedTransaction,
            activityId: completed.id // Activity ID from completed object
        };

    } catch (e) {
        console.error("Failed to initiate transfer:", e);
        throw e;
    }
}

// Polling Helper
export async function pollActivity(activityId: string, organizationId: string) {
    for (let i = 0; i < 10; i++) {
        const response = await turnkeyClient.getActivity({
            activityId,
            organizationId,
        });

        const activity = response.activity;

        if (activity.status === "ACTIVITY_STATUS_COMPLETED") {
            return activity;
        }

        if (activity.status === "ACTIVITY_STATUS_FAILED") {
            throw new Error(`Activity failed: ${activity.id}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error("Activity polling timeout");
}
