
# Stage 1: Build React static assets with Vite
FROM node:20-alpine AS build

WORKDIR /app

# Accept Backend API Base URL as a build argument
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve built assets using Nginx
FROM nginx:alpine

# Copy built production assets
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTP port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
