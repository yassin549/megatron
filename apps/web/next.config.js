const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@megatron/database', '@megatron/lib-common', '@megatron/lib-crypto'],
    images: {
        domains: [
            'avatars.githubusercontent.com',
            'images.unsplash.com',
            'plus.unsplash.com',
            'cryptologos.cc',
            'assets.coingecko.com',
            'cdn.jsdelivr.net',
            'raw.githubusercontent.com',
            'upload.wikimedia.org',
            'wikipedia.org',
            'cdn-icons-png.flaticon.com',
            's2.coinmarketcap.com'
        ],
    },
    webpack: (config) => {
        config.externals.push({
            'utf-8-validate': 'commonjs utf-8-validate',
            'bufferutil': 'commonjs bufferutil',
            'onnxruntime-node': 'commonjs onnxruntime-node',
        });
        // Ignore .node files to prevent webpack loader errors
        config.module.rules.push({
            test: /\.node$/,
            use: 'node-loader',
        });
        return config;
    },
    experimental: {
        serverComponentsExternalPackages: ['onnxruntime-node', '@huggingface/transformers', 'sharp'],
    },
};

module.exports = nextConfig;
