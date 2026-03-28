# ============================================
# Stage 1: Build the application
# ============================================
FROM node:22-alpine AS builder

ARG VITE_DOCUMENT_FILE_URL_TEMPLATE
ENV VITE_DOCUMENT_FILE_URL_TEMPLATE=${VITE_DOCUMENT_FILE_URL_TEMPLATE}

# Set working directory
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files first for better layer caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN pnpm build

# ============================================
# Stage 2: Serve with nginx
# ============================================
FROM nginx:alpine AS production

ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

# Copy custom nginx template configuration
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create directory for static files (optional: copy if exists)
RUN mkdir -p /usr/share/nginx/static
# Uncomment the line below if you have a static folder in your project
# COPY --from=builder /app/static /usr/share/nginx/static

# Expose port 80
EXPOSE 80

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
