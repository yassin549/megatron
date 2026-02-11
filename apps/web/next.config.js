const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
    optimizeFonts: false,
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
        });
        return config;
    },
    experimental: {
        serverComponentsExternalPackages: ['sharp'],
        outputFileTracingExcludes: {
            '*': [
                'node_modules/@swc/core-linux-x64-gnu',
                'node_modules/@swc/core-linux-x64-musl',
                'node_modules/@esbuild/linux-x64',
                'node_modules/webpack',
                'node_modules/terser',
                '**/node_modules/.cache',
                '**/*.map',
                '**/*.d.ts'
            ],
        },
    },
};

module.exports = nextConfig;
