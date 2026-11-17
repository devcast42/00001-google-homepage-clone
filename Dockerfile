# syntax=docker/dockerfile:1

# ---- Compilación: dependencias completas, TypeScript, frontend e índice ----
FROM node:22.23-alpine AS build
WORKDIR /app

# Primero solo los manifiestos, para que la capa de dependencias se reutilice
# mientras no cambien.
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY apps/crawler/package.json apps/crawler/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --no-audit --no-fund

COPY . .
# El índice se genera a partir del corpus versionado: no hace falta red.
RUN npm run build && npm run index

# ---- Ejecución: solo dependencias de producción de la API ----
FROM node:22.23-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    INDEX_PATH=/app/data/index.json \
    WEB_ROOT=/app/apps/web/dist
WORKDIR /app

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/packages/engine/package.json packages/engine/
COPY --from=build /app/apps/crawler/package.json apps/crawler/
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/web/package.json apps/web/
RUN npm ci --omit=dev --no-audit --no-fund --workspace @docseek/api \
    && npm cache clean --force

COPY --from=build /app/packages/engine/dist packages/engine/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/web/dist apps/web/dist
COPY --from=build /app/data/index.json data/index.json

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "apps/api/dist/server.js"]
