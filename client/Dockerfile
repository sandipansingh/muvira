FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN pnpm install --frozen-lockfile

COPY client ./client

ARG VITE_API_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_STORE_NAME=Muvira
ARG VITE_AUTH_REDIRECT_URL

RUN test -n "$VITE_API_URL" \
    && test -n "$VITE_SUPABASE_URL" \
    && test -n "$VITE_SUPABASE_ANON_KEY" \
    && test -n "$VITE_AUTH_REDIRECT_URL" \
    && pnpm --filter client build

FROM nginx:stable-alpine

COPY --from=build /app/client/dist /usr/share/nginx/html
COPY --from=build /app/client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
