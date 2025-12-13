const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@megatron/database', '@megatron/lib-common'],
    images: {
        domains: ['avatars.githubusercontent.com'],
    },
};

module.exports = nextConfig;
