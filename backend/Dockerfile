# Use Node.js 20 LTS
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files first (for better Docker layer caching)
# If Dockerfile Path is "backend/Dockerfile", build context is repo root
# Copy from backend/ directory to current working directory
COPY backend/package.json ./package.json
COPY backend/package-lock.json* ./package-lock.json

# Install all dependencies (including devDependencies for build)
# Try npm ci first (faster, reproducible), fallback to npm install if it fails
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# Copy all backend source code
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Keep tsx and typescript for database migrations (used in release command)
# Remove other devDependencies to reduce image size
RUN npm uninstall @types/bcryptjs @types/cors @types/express @types/jsonwebtoken @types/node @types/pg @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint || true

# Expose port (Railway will set PORT env var)
EXPOSE ${PORT:-8000}

# Start the application
CMD ["npm", "start"]
