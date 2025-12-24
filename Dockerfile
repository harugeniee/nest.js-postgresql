# Multi-stage build for NestJS application
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install Python, Make, and G++ for Roaring Bitmap
RUN apk add --no-cache g++ make python3

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Remove devDependencies and clean up node_modules to reduce size
# This keeps native modules compiled but removes development tools
RUN yarn install --frozen-lockfile --production && \
    yarn cache clean

# Production stage
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Copy production node_modules from builder stage (already pruned and compiled)
# This avoids recompiling native modules and removes need for build tools
COPY --from=builder /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy i18n translation files (required at runtime by nestjs-i18n)
# The i18n module looks for translations at ../i18n/ relative to dist folder
COPY --from=builder /app/src/i18n ./i18n

# Copy only package.json (without devDependencies) for runtime metadata if needed
# Remove yarn.lock as it's not needed in production
COPY --from=builder /app/package.json ./package.json

# Verify dist folder exists and main.js is present before proceeding
RUN test -f dist/main.js || (echo "ERROR: dist/main.js not found!" && ls -la dist/ && exit 1)

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership of the app directory
RUN chown -R nestjs:nodejs /app
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v5', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
# Note: NestJS builds to dist/main.js (matches package.json start:prod script)
CMD ["node", "dist/main.js"] 