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

# Copy only package.json (without devDependencies) for runtime metadata if needed
# Remove yarn.lock as it's not needed in production
COPY --from=builder /app/package.json ./package.json

# Clean up unnecessary files in node_modules to further reduce size
# Remove documentation, tests, source maps, TypeScript definitions, and other non-essential files
# Using -exec is safer than xargs and handles empty results gracefully
# Note: Only clean node_modules, never touch dist folder
RUN find node_modules -type d \( -name "test" -o -name "tests" -o -name "__tests__" -o -name "spec" -o -name "specs" \) -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d \( -name "docs" -o -name "doc" -o -name "documentation" \) -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type f \( -name "*.md" -o -name "*.markdown" -o -name "CHANGELOG*" -o -name "LICENSE*" -o -name "AUTHORS*" -o -name "NOTICE*" -o -name "README*" -o -name "HISTORY*" -o -name "CONTRIBUTING*" \) -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.map" ! -path "*/source-map-support/*" -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.ts" ! -path "*/typescript/*" ! -path "*/@types/*" ! -path "*/ts-node/*" ! -path "*/tslib/*" -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.tsx" -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.d.ts" ! -path "*/@types/*" -delete 2>/dev/null || true && \
    find node_modules -type d -name ".github" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d \( -name "examples" -o -name "example" -o -name "samples" -o -name "sample" \) -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type d -name "benchmark" -o -name "benchmarks" -exec rm -rf {} + 2>/dev/null || true && \
    find node_modules -type f -name "*.png" ! -path "*/sharp/*" ! -path "*/canvas/*" -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.jpg" ! -path "*/sharp/*" ! -path "*/canvas/*" -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.gif" ! -path "*/sharp/*" ! -path "*/canvas/*" -delete 2>/dev/null || true && \
    find node_modules -type f -name "*.svg" ! -path "*/sharp/*" ! -path "*/canvas/*" -delete 2>/dev/null || true && \
    find node_modules -type f -name ".npmignore" -delete 2>/dev/null || true && \
    find node_modules -type f -name ".editorconfig" -delete 2>/dev/null || true && \
    find node_modules -type f -name ".eslintrc*" -delete 2>/dev/null || true && \
    find node_modules -type f -name ".prettierrc*" -delete 2>/dev/null || true && \
    find node_modules -type f -name "tsconfig.json" -delete 2>/dev/null || true && \
    find node_modules -type f -name "jest.config.*" -delete 2>/dev/null || true && \
    find node_modules -type f -name ".travis.yml" -delete 2>/dev/null || true && \
    find node_modules -type f -name ".gitignore" -delete 2>/dev/null || true && \
    rm -rf node_modules/.cache 2>/dev/null || true && \
    rm -rf node_modules/.bin/*.cmd 2>/dev/null || true && \
    rm -rf /tmp/* 2>/dev/null || true

# Remove source maps from dist folder (optional - comment out if you need them for debugging)
RUN find dist -type f -name "*.map" -delete 2>/dev/null || true

# Remove TypeScript declaration files from dist (not needed at runtime)
RUN find dist -type f -name "*.d.ts" -delete 2>/dev/null || true

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
  CMD node -e "require('http').get('http://localhost:3000/api/v1', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
# Note: NestJS builds to dist/main.js (matches package.json start:prod script)
CMD ["node", "dist/main.js"] 