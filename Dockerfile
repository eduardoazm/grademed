# Stage 1: Build static assets using Node.js
FROM node:20-alpine AS builder

WORKDIR /app

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package configuration files
COPY package.json package-lock.json* bun.lock* ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build the static site (Outputs to /app/out via output: 'export' in next.config.ts)
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine AS runner

# Remove default Nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built static files from builder stage
COPY --from=builder /app/out /usr/share/nginx/html

# Copy custom optimized Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Omit Nginx version info for security
RUN sed -i 's/#\?server_tokens off;/server_tokens off;/g' /etc/nginx/nginx.conf 2>/dev/null || true

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
