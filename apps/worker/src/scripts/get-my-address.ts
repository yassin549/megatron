
import './setup-env';
import { db } from '@megatron/database';
import { deriveAddress } from '@megatron/lib-crypto';

async function main() {
    const email = process.env.ADMIN_EMAIL || 'admin@megatron.com';
    const xpub = process.env.PLATFORM_XPUB;

    if (!xpub) {
        throw new Error("Missing PLATFORM_XPUB");
    }

    console.log(`Checking user: ${email}`);

    let user = await db.user.findUnique({ where: { email } });

    if (!user) {
        console.log("User not found, creating...");
        user = await db.user.create({
            data: {
                email,
                passwordHash: 'placeholder',
                walletHotBalance: 0,
                walletColdBalance: 0,
            }
        });
    }

    if (user.depositAddress) {
        console.log(`\n=== YOUR DEPOSIT ADDRESS ===`);
        console.log(user.depositAddress);
        console.log(`============================\n`);
        return;
    }

    console.log("Generating new address...");

    // Assign new address
    const address = await db.$transaction(async (tx: any) => {
        let config = await tx.platformConfig.findUnique({
            where: { key: 'next_address_index' }
        });

        let index: number;
        if (!config) {
            index = 1;
            await tx.platformConfig.create({
                data: { key: 'next_address_index', value: '2' }
            });
        } else {
            index = parseInt(config.value);
            await tx.platformConfig.update({
                where: { key: 'next_address_index' },
                data: { value: (index + 1).toString() }
            });
        }

        const newAddress = deriveAddress(xpub, index);

        await tx.user.update({
            where: { id: user.id },
            data: {
                depositAddress: newAddress,
                addressIndex: index
            }
        });

        return newAddress;
    });

    console.log(`\n=== YOUR DEPOSIT ADDRESS ===`);
    console.log(address);
    console.log(`============================\n`);
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
