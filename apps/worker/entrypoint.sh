#!/bin/sh
set -e

echo "=== ENTRYPOINT DEBUG ==="
echo "Current directory: $(pwd)"
echo ""
echo "=== Listing current directory ==="
ls -la
echo ""
echo "=== Looking for dist folder ==="
find /app -name "dist" -type d 2>/dev/null || echo "No dist folders found"
echo ""
echo "=== Looking for index.js ==="
find /app -name "index.js" 2>/dev/null || echo "No index.js files found"
echo ""
echo "=== Checking expected path ==="
if [ -f "dist/index.js" ]; then
    echo "✓ dist/index.js exists"
    ls -la dist/index.js
else
    echo "✗ dist/index.js NOT FOUND"
    echo "Contents of current directory:"
    ls -laR | head -100
fi
echo "=== END DEBUG ==="
echo ""

# Manually recreate workspace package symlinks (Docker COPY doesn't preserve them)
echo "=== Creating workspace package symlinks ==="

# Create symlinks at root level
mkdir -p /app/node_modules/@megatron
ln -sf /app/packages/lib-ai /app/node_modules/@megatron/lib-ai
ln -sf /app/packages/lib-common /app/node_modules/@megatron/lib-common
ln -sf /app/packages/lib-crypto /app/node_modules/@megatron/lib-crypto
ln -sf /app/packages/lib-integrations /app/node_modules/@megatron/lib-integrations
ln -sf /app/packages/database /app/node_modules/@megatron/database

# Also create symlinks in worker's node_modules (Node.js checks here too)
mkdir -p /app/apps/worker/node_modules/@megatron
ln -sf /app/packages/lib-ai /app/apps/worker/node_modules/@megatron/lib-ai
ln -sf /app/packages/lib-common /app/apps/worker/node_modules/@megatron/lib-common
ln -sf /app/packages/lib-crypto /app/apps/worker/node_modules/@megatron/lib-crypto
ln -sf /app/packages/lib-integrations /app/apps/worker/node_modules/@megatron/lib-integrations
ln -sf /app/packages/database /app/apps/worker/node_modules/@megatron/database

# Verify symlinks were created
if [ -L "/app/node_modules/@megatron/lib-ai" ] && [ -L "/app/apps/worker/node_modules/@megatron/lib-ai" ]; then
    echo "✓ Workspace symlinks created successfully"
else
    echo "✗ Failed to create symlinks"
    exit 1
fi
echo ""

# Run from /app root so Node.js can resolve workspace packages
if [ -f "/app/apps/worker/dist/apps/worker/src/index.js" ]; then
    exec node /app/apps/worker/dist/apps/worker/src/index.js
else
    echo "ERROR: Cannot find /app/apps/worker/dist/apps/worker/src/index.js"
    exit 1
fi
