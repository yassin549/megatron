
import fs from 'fs';
import path from 'path';
import https from 'https';
import { IncomingMessage } from 'http';

const ASSETS = [
    { name: 'bitcoin-sentiment.jpg', url: 'https://unsplash.com/photos/kFWaFMIrYDE/download?force=true' }, // Bitcoin
    { name: 'us-unemployment.jpg', url: 'https://unsplash.com/photos/LcvKoG_MS3k/download?force=true' },   // Unemployment
    { name: 'premier-league.jpg', url: 'https://unsplash.com/photos/x8F04gGbLa0/download?force=true' },    // Premier League
    { name: 'global-temperature.jpg', url: 'https://unsplash.com/photos/vRyq9MB6U34/download?force=true' }, // Global Warming
    { name: 'eth-gas.jpg', url: 'https://unsplash.com/photos/d8AURrtQXmE/download?force=true' },            // ETH Gas
    { name: 'ai-hype.jpg', url: 'https://unsplash.com/photos/FYOwBvRb2Mk/download?force=true' },            // AI Brain
];

const DOWNLOAD_DIR = path.join(process.cwd(), 'apps/web/public/assets');

if (!fs.existsSync(DOWNLOAD_DIR)) {
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

function downloadImage(url: string, filepath: string) {
    return new Promise((resolve, reject) => {
        https.get(url, (response: IncomingMessage) => {
            // Handle redirects (Unsplash uses them)
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadImage(response.headers.location!, filepath)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
                return;
            }

            const file = fs.createWriteStream(filepath);
            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log(`✅ Downloaded: ${path.basename(filepath)}`);
                resolve(true);
            });

            file.on('error', (err) => {
                fs.unlink(filepath, () => { });
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

async function main() {
    console.log('⬇️  Starting image downloads...');

    for (const asset of ASSETS) {
        const filepath = path.join(DOWNLOAD_DIR, asset.name);
        try {
            await downloadImage(asset.url, filepath);
        } catch (error) {
            console.error(`❌ Error downloading ${asset.name}:`, error);
        }
    }

    console.log('🎉 All downloads complete!');
}

main();
