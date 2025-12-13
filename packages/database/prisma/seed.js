"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seed...');
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@megatron.dev' },
        update: {},
        create: {
            email: 'admin@megatron.dev',
            passwordHash: adminPassword,
            isAdmin: true,
            walletHotBalance: 100000,
            depositAddress: '0x1234567890123456789012345678901234567890'
        }
    });
    console.log('✅ Admin:', admin.email);
    // Test users
    for (let i = 1; i <= 5; i++) {
        const user = await prisma.user.upsert({
            where: { email: `user${i}@test.com` },
            update: {},
            create: {
                email: `user${i}@test.com`,
                passwordHash: await bcrypt.hash('password123', 10),
                walletHotBalance: 10000,
                depositAddress: `0x${i.toString().repeat(40)}`
            }
        });
        console.log(`✅ User ${i}:`, user.email);
    }
    // Platform config
    await prisma.platformConfig.upsert({
        where: { key: 'treasury_balance' },
        update: {},
        create: { key: 'treasury_balance', value: '0' }
    });
    console.log('✅ Platform config created');
    console.log('\n🎉 Seed completed!');
}
main()
    .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
})
    .finally(() => prisma.$disconnect());
