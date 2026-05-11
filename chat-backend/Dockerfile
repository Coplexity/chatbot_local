# Install dependencies
FROM node:22-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Install production dependencies
FROM node:22-alpine AS deps-production
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod --frozen-lockfile

# Rebuild the source code only when needed
FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY src/ src/
COPY tsconfig*.json ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=deps /app/node_modules ./node_modules
RUN pnpm build

# Production image
FROM node:22-alpine AS runner
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN mkdir -p /app
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --from=deps-production /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

CMD ["pnpm", "start:prod"]
