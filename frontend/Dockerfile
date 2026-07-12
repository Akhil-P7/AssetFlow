# Stage 1: Build the React Vite Application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definition files
COPY package.json package-lock.json ./

# Install dependencies (frozen lockfile for production)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:1.25-alpine

# Remove default Nginx website configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
