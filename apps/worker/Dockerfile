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
# Using direct build for worker to ensure dist is created in the correct workspace
RUN cd apps/worker && pnpm build && ls -l dist/index.js && rm -rf node_modules

# Runner stage
FROM base AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
# Install pnpm in the runner stage as well
RUN npm install -g pnpm

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 megatron
RUN chown -R megatron:nodejs /app
USER megatron

COPY --from=installer --chown=megatron:nodejs /app .

# DEBUG: List files to debug missing module
RUN find . -maxdepth 4 -not -path '*/.*'

# Set environment variables if needed (can be overridden at runtime)
ENV NODE_ENV=production

# Command to run the worker
# using direct node execution to avoid pnpm workspace resolution issues in runner
# Command to run the worker
# using direct node execution to avoid pnpm workspace resolution issues in runner
CMD ["node", "./apps/worker/dist/index.js"]
