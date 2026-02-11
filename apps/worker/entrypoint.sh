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

# Check if workspace packages are properly linked
echo "=== Checking workspace package symlinks ==="
if [ -L "/app/node_modules/@megatron/lib-ai" ]; then
    echo "✓ @megatron/lib-ai symlink exists"
    ls -la /app/node_modules/@megatron/lib-ai
    echo "Target: $(readlink /app/node_modules/@megatron/lib-ai)"
else
    echo "✗ @megatron/lib-ai symlink MISSING"
    echo "Checking if package exists elsewhere:"
    find /app/packages -name "lib-ai" -type d 2>/dev/null || echo "Not found"
fi
echo ""

# Run from /app root so Node.js can resolve workspace packages
if [ -f "/app/apps/worker/dist/apps/worker/src/index.js" ]; then
    exec node /app/apps/worker/dist/apps/worker/src/index.js
else
    echo "ERROR: Cannot find /app/apps/worker/dist/apps/worker/src/index.js"
    exit 1
fi
