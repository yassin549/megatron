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
# Ensure we are at the root and build all dependencies
RUN pnpm run build --filter=@megatron/worker

# Runner stage
FROM base AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 megatron

# Copy the entire workspace from installer
COPY --from=installer --chown=megatron:nodejs /app .

# Debug: Show directory structure
RUN echo "=== Listing /app ===" && ls -la /app
RUN echo "=== Listing /app/apps ===" && ls -la /app/apps || echo "apps folder not found"
RUN echo "=== Listing /app/apps/worker ===" && ls -la /app/apps/worker || echo "worker folder not found"  
RUN echo "=== Finding all dist folders ===" && find /app -name "dist" -type d || echo "no dist folders found"
RUN echo "=== Finding index.js files ===" && find /app -name "index.js" || echo "no index.js found"

USER megatron

# Set environment variables
ENV NODE_ENV=production

# Change to worker directory
WORKDIR /app/apps/worker

# Command to run the worker (now from worker directory)
CMD ["node", "dist/index.js"]
