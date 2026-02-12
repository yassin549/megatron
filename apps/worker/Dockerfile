FROM node:20-alpine AS base

# This Dockerfile is designed to be built from the monorepo root
# Command: docker build -f apps/worker/Dockerfile .

FROM base AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
# Install turbo globally
RUN npm install turbo --global
COPY . .
# Prune the workspace to just the worker and its dependencies
RUN turbo prune --scope=@megatron/worker --docker

# Installer stage
FROM base AS installer
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Install dependencies based on the pruned lockfile
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY tsconfig.json tsconfig.json

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --ignore-scripts
# Copy the full source code from the prune step
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# FIX: Explicitly generate Prisma Client since postinstall scripts might be skipped
RUN cat packages/database/package.json
RUN cd packages/database && pnpm run generate

# Build the project
# Build the project
# Build and copy all workspace dependencies manually to ensure resolution works
# Clean up potential conflicting symlinks first
RUN rm -rf node_modules/@megatron && \
    rm -rf apps/worker/node_modules/@megatron

# 1. lib-common
RUN pnpm run build --filter=@megatron/lib-common
RUN mkdir -p node_modules/@megatron/lib-common && \
    cp -r packages/lib-common/dist node_modules/@megatron/lib-common/ && \
    cp packages/lib-common/package.json node_modules/@megatron/lib-common/

# 2. lib-crypto
RUN pnpm run build --filter=@megatron/lib-crypto
RUN mkdir -p node_modules/@megatron/lib-crypto && \
    cp -r packages/lib-crypto/dist node_modules/@megatron/lib-crypto/ && \
    cp packages/lib-crypto/package.json node_modules/@megatron/lib-crypto/

# 3. lib-integrations
RUN pnpm run build --filter=@megatron/lib-integrations
RUN mkdir -p node_modules/@megatron/lib-integrations && \
    cp -r packages/lib-integrations/dist node_modules/@megatron/lib-integrations/ && \
    cp packages/lib-integrations/package.json node_modules/@megatron/lib-integrations/

# 4. database
RUN pnpm run build --filter=@megatron/database
RUN mkdir -p node_modules/@megatron/database && \
    cp -r packages/database/dist node_modules/@megatron/database/ && \
    cp packages/database/package.json node_modules/@megatron/database/

# 5. lib-ai (depends on above)
RUN pnpm run build --filter=@megatron/lib-ai
RUN mkdir -p node_modules/@megatron/lib-ai && \
    cp -r packages/lib-ai/dist node_modules/@megatron/lib-ai/ && \
    cp packages/lib-ai/package.json node_modules/@megatron/lib-ai/

# Finally build worker
RUN pnpm run build:docker --filter=@megatron/worker

# Verify the build created dist in the right place
RUN echo "=== Verifying build output ===" && \
    ls -la apps/worker/ && \
    ls -la apps/worker/dist/ && \
    echo "=== Build verification complete ==="

# Runner stage
FROM base AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 megatron

# Copy the entire workspace from installer
COPY --from=installer --chown=megatron:nodejs /app .

# Copy entrypoint script
COPY --chown=megatron:nodejs apps/worker/entrypoint.sh /app/apps/worker/entrypoint.sh
RUN chmod +x /app/apps/worker/entrypoint.sh

USER megatron

# Set environment variables
ENV NODE_ENV=production

# Stay at monorepo root for proper module resolution
WORKDIR /app

# Use entrypoint script for debugging
CMD ["/app/apps/worker/entrypoint.sh"]
