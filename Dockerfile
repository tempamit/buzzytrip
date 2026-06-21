# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22.17.1

FROM node:${NODE_VERSION}-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json

RUN npm ci

FROM dependencies AS source
COPY . .

FROM source AS shared-build
RUN npm run build --workspace=@buzzytrip/contracts \
    && npm run build --workspace=@buzzytrip/config \
    && npm run build --workspace=@buzzytrip/database

FROM shared-build AS web-build
RUN npm run build --workspace=@buzzytrip/web

FROM node:${NODE_VERSION}-bookworm-slim AS web
WORKDIR /app
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=web-build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static

USER node
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["node", "server.js"]

FROM shared-build AS services-build
RUN npm run build --workspace=@buzzytrip/api \
    && npm run build --workspace=@buzzytrip/worker \
    && npm prune --omit=dev

FROM node:${NODE_VERSION}-bookworm-slim AS service-runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=services-build --chown=node:node /app/node_modules ./node_modules
COPY --from=services-build --chown=node:node /app/package.json /app/package-lock.json ./

COPY --from=services-build --chown=node:node /app/packages/config/package.json ./packages/config/package.json
COPY --from=services-build --chown=node:node /app/packages/config/dist ./packages/config/dist
COPY --from=services-build --chown=node:node /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=services-build --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=services-build --chown=node:node /app/packages/database/package.json ./packages/database/package.json
COPY --from=services-build --chown=node:node /app/packages/database/dist ./packages/database/dist
COPY --from=services-build --chown=node:node /app/packages/database/drizzle ./packages/database/drizzle

USER node

FROM service-runtime AS api
ENV PORT=4000
COPY --from=services-build --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=services-build --chown=node:node /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]
FROM service-runtime AS worker
COPY --from=services-build --chown=node:node /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=services-build --chown=node:node /app/apps/worker/dist ./apps/worker/dist
WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]
