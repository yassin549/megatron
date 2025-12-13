import { ethers } from 'ethers';

// Default to Arbitrum One if not specified
const RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo';

export function getProvider(): ethers.JsonRpcProvider {
    return new ethers.JsonRpcProvider(RPC_URL);
}

export async function getBlockNumber(): Promise<number> {
    const provider = getProvider();
    return await provider.getBlockNumber();
}
