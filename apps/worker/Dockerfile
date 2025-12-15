FROM node:20-alpine AS base

# This Dockerfile is designed to be built from the monorepo root
# Command: docker build -f apps/worker/Dockerfile .

FROM base AS builder
RUN apk add --no-cache libc6-compat compat-openssl11 openssl
WORKDIR /app
# Install turbo globally
RUN npm install turbo --global
COPY . .
# Prune the workspace to just the worker and its dependencies
RUN turbo prune --scope=@megatron/worker --docker

# Installer stage
FROM base AS installer
RUN apk add --no-cache libc6-compat compat-openssl11 openssl
WORKDIR /app

# Install dependencies based on the pruned lockfile
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY tsconfig.json tsconfig.json

# Install pnpm and dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
# Copy the full source code from the prune step
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# FIX: Explicitly generate Prisma Client since postinstall scripts might be skipped
RUN cat packages/database/package.json
RUN cd packages/database && pnpm run generate

# Build the project
RUN pnpm run build --filter=@megatron/worker...

# Runner stage
FROM base AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat compat-openssl11 openssl

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 megatron
USER megatron

COPY --from=installer /app .

# Set environment variables if needed (can be overridden at runtime)
ENV NODE_ENV=production

# Command to run the worker
# Adjust the path if the structure is different, but turbo prune usually preserves apps/worker
CMD ["node", "apps/worker/dist/index.js"]
