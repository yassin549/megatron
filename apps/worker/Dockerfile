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
# Ensure we are at the root and build all dependencies
RUN pnpm run build --filter=@megatron/lib-ai
# Manually copy built lib-ai to node_modules to ensure worker can find it
RUN mkdir -p node_modules/@megatron/lib-ai && \
    cp -r packages/lib-ai/dist node_modules/@megatron/lib-ai/ && \
    cp packages/lib-ai/package.json node_modules/@megatron/lib-ai/

RUN pnpm run build --filter=@megatron/worker

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
