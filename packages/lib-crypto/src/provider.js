"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProvider = getProvider;
exports.getBlockNumber = getBlockNumber;
const ethers_1 = require("ethers");
// Default to Arbitrum One if not specified
const RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo';
function getProvider() {
    return new ethers_1.ethers.JsonRpcProvider(RPC_URL);
}
async function getBlockNumber() {
    const provider = getProvider();
    return await provider.getBlockNumber();
}
