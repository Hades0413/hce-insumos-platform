# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Imagen única para los 3 servicios del monorepo NestJS.
#   docker build --build-arg APP=inventory-service -t hce/inventory-service backend
# APP: api-gateway | auth-service | inventory-service
# -----------------------------------------------------------------------------
ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --- dependencias completas (build)
FROM base AS deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --- dependencias de producción únicamente (runtime más pequeño y con menos superficie)
FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# --- build de UN servicio (webpack bundle de app + libs compartidas)
FROM deps AS build
ARG APP
RUN test -n "${APP}" || (echo "Falta --build-arg APP" && exit 1)
COPY nest-cli.json tsconfig.json tsconfig.build.json webpack.config.js ./
COPY libs ./libs
COPY apps ./apps
RUN pnpm exec nest build "${APP}"

# --- runtime: usuario sin privilegios, tini como PID 1 (señales => graceful shutdown)
FROM node:${NODE_VERSION} AS runtime
ARG APP
ENV NODE_ENV=production APP=${APP}
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist/apps/${APP}/main.js ./main.js
COPY --chown=node:node package.json ./
USER node
EXPOSE 4000 9464
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "--enable-source-maps", "main.js"]
