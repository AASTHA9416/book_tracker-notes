# Multi-stage Dockerfile

# Builder stage: install dependencies and prepare app
FROM node:22-slim AS builder
WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies (use npm ci with lockfile, then prune to production)
RUN npm ci && npm prune --production

# Copy application files
COPY . .

# If you have a build step (e.g. for frontend assets), run it here. If not, this will harmlessly continue.
RUN sh -c "npm run build 2>/dev/null || true"


# Final stage: smaller runtime image
FROM node:22-slim AS runtime
WORKDIR /app

# Set production mode
ENV NODE_ENV=production

# Copy only the artifacts from the builder stage (includes node_modules and built assets)
COPY --from=builder /app /app

# Expose application port
EXPOSE 3000
ENV PORT=3000

# Entrypoint
CMD ["node", "index.js"]