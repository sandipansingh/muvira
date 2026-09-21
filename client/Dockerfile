# Build stage
FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN pnpm install --frozen-lockfile

COPY client ./client

RUN pnpm --filter client build

# Production stage - use nginx for serving static files
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/client/dist /usr/share/nginx/html

# Copy custom nginx config for SPA (React Router support)
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
