# syntax=docker/dockerfile:1.7
# ---------------------------------------------------------------------------
# Imagen única para las 4 zonas del frontend (Multi-Zones).
#   docker build --build-arg APP=mf-ventas -t hce/mf-ventas .
# APP: shell | mf-compras | mf-ventas | mf-kardex
# NEXT_PUBLIC_* y MF_*_URL son de BUILD: Next los compila en el bundle y en
# el routes-manifest (rewrites del shell).
# ---------------------------------------------------------------------------
ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

# --- deps: solo manifiestos => la capa se cachea mientras no cambien dependencias
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/shell/package.json apps/shell/
COPY apps/mf-compras/package.json apps/mf-compras/
COPY apps/mf-ventas/package.json apps/mf-ventas/
COPY apps/mf-kardex/package.json apps/mf-kardex/
COPY packages/domain/package.json packages/domain/
COPY packages/api-client/package.json packages/api-client/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# --- build de UNA zona
FROM deps AS build
ARG APP
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ARG MF_COMPRAS_URL=http://mf-compras:3001
ARG MF_VENTAS_URL=http://mf-ventas:3002
ARG MF_KARDEX_URL=http://mf-kardex:3003
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    MF_COMPRAS_URL=${MF_COMPRAS_URL} \
    MF_VENTAS_URL=${MF_VENTAS_URL} \
    MF_KARDEX_URL=${MF_KARDEX_URL} \
    NODE_ENV=production
COPY . .
RUN test -n "${APP}" || (echo "Falta --build-arg APP" && exit 1)
RUN pnpm --filter "@hce/${APP}" build

# --- runtime mínimo: solo el output standalone, usuario sin privilegios
FROM node:${NODE_VERSION} AS runtime
ARG APP
ARG PORT=3000
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=${PORT}
WORKDIR /app
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=build --chown=nextjs:nodejs /repo/apps/${APP}/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/${APP}/public ./apps/${APP}/public
ENV APP=${APP} APP_DIR=/app/apps/${APP}
USER nextjs
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "const a=process.env.APP;const p=a==='shell'?'/login':'/'+a.replace('mf-','');fetch('http://127.0.0.1:'+process.env.PORT+p,{redirect:'manual'}).then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["sh", "-c", "exec node \"$APP_DIR/server.js\""]
