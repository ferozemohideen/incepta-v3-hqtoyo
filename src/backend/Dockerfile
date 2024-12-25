# Stage 1: Builder
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    # Clean up cache to reduce layer size
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files for caching optimization
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci

# Copy source code and config files
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Run security audit
RUN npm audit

# Prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:18-alpine

# Set Node.js environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Install production dependencies
RUN apk add --no-cache \
    wget \
    # Clean up cache to reduce layer size
    && rm -rf /var/cache/apk/*

# Create non-root user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy built artifacts and dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Set correct ownership and permissions
RUN chown -R appuser:appgroup /app && \
    chmod -R 550 /app && \
    chmod -R 500 /app/node_modules && \
    chmod -R 500 /app/dist

# Create and set permissions for required directories
RUN mkdir -p /tmp/uploads && \
    chown -R appuser:appgroup /tmp/uploads && \
    chmod 1777 /tmp/uploads

# Switch to non-root user
USER appuser

# Expose application port
EXPOSE 3000

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Security hardening
LABEL org.opencontainers.image.vendor="Incepta" \
      org.opencontainers.image.title="Incepta Backend" \
      org.opencontainers.image.description="Backend service for Incepta Platform" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.source="https://github.com/incepta/incepta-backend"

# Set read-only root filesystem
RUN chmod a-w /etc

# Define volumes for temporary storage and node_modules
VOLUME ["/tmp/uploads", "/app/node_modules"]

# Start the application with proper signal handling
CMD ["node", "dist/server.js"]