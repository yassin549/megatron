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
                'node_modules/@swc/core-*',
                'node_modules/@esbuild/*',
                'node_modules/webpack/**/*',
                'node_modules/terser/**/*',
                '.cache/**/*'
            ],
        },
        outputFileTracingIncludes: {
            '*': [
                './node_modules/styled-jsx/**/*',
                '../../node_modules/styled-jsx/**/*'
            ],
        },
    },
    output: 'standalone',
};

module.exports = nextConfig;
