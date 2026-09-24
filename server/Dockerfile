FROM node:20-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN pnpm install --frozen-lockfile

COPY server ./server
RUN pnpm --filter server build
RUN pnpm deploy --filter server --prod /prod/server

FROM node:20-alpine AS runtime

ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --chown=node:node --from=build /prod/server ./

USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
