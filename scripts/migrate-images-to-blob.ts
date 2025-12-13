/**
 * Migration Script: Upload existing local images to Vercel Blob
 * 
 * This script:
 * 1. Reads all images from public/assets/generated/
 * 2. Uploads each to Vercel Blob
 * 3. Updates the database Asset.imageUrl with the new blob URLs
 * 
 * Run: npx tsx scripts/migrate-images-to-blob.ts
 */

import { put } from '@vercel/blob';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of local filenames to asset identifiers
const IMAGE_MAPPINGS: Record<string, string> = {
    'ai_hype.png': 'AI Hype Index',
    'eth_gas.png': 'ETH Gas Price Index',
    'climate.png': 'Global Temperature Anomaly',
    'soccer.png': 'Premier League Champion',
    'unemployment.png': 'US Unemployment Rate',
    'bitcoin.png': 'Bitcoin Twitter Sentiment',
};

async function migrateImages() {
    console.log('🚀 Starting image migration to Vercel Blob...\n');

    const imagesDir = join(process.cwd(), 'apps', 'web', 'public', 'assets', 'generated');

    try {
        const files = await readdir(imagesDir);
        const imageFiles = files.filter(f => f.endsWith('.png') || f.endsWith('.jpg'));

        console.log(`📁 Found ${imageFiles.length} images to migrate\n`);

        const results: { file: string; blobUrl: string; assetName: string | null }[] = [];

        for (const filename of imageFiles) {
            const filePath = join(imagesDir, filename);
            const fileBuffer = await readFile(filePath);

            // Upload to Vercel Blob
            const blobFilename = `assets/generated/${filename}`;
            const blob = await put(blobFilename, fileBuffer, {
                access: 'public',
                addRandomSuffix: false,
                contentType: filename.endsWith('.png') ? 'image/png' : 'image/jpeg',
            });

            console.log(`✅ Uploaded: ${filename}`);
            console.log(`   → ${blob.url}\n`);

            // Find matching asset and update
            const assetName = IMAGE_MAPPINGS[filename];
            if (assetName) {
                const asset = await prisma.asset.findFirst({
                    where: { name: assetName }
                });

                if (asset) {
                    await prisma.asset.update({
                        where: { id: asset.id },
                        data: { imageUrl: blob.url }
                    });
                    console.log(`   📝 Updated database for: ${assetName}\n`);
                } else {
                    console.log(`   ⚠️ Asset not found: ${assetName}\n`);
                }
            }

            results.push({
                file: filename,
                blobUrl: blob.url,
                assetName: assetName || null
            });
        }

        console.log('\n✨ Migration Complete!\n');
        console.log('Summary:');
        console.table(results);

        // Verify database updates
        console.log('\n📊 Current Asset Image URLs:');
        const assets = await prisma.asset.findMany({
            select: { name: true, imageUrl: true }
        });
        console.table(assets);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration
migrateImages();
