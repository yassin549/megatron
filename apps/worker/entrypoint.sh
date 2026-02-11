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

# Try to run the app
if [ -f "dist/apps/worker/src/index.js" ]; then
    exec node dist/apps/worker/src/index.js
else
    echo "ERROR: Cannot find dist/apps/worker/src/index.js"
    exit 1
fi
