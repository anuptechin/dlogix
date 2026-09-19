# ---- base ----
FROM node:20-slim AS base
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# workspace manifests first (better layer caching)
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

# ---- deps ----
FROM base AS deps
RUN npm install
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run prisma:generate -w @lprms/api

# ---- dev (hot reload; source is bind-mounted by compose) ----
FROM deps AS dev
ENV NODE_ENV=development
EXPOSE 3093
CMD ["npm", "run", "start:dev", "-w", "@lprms/api"]

# ---- build ----
FROM deps AS build
RUN npm run build -w @lprms/api

# ---- production ----
FROM node:20-slim AS prod
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/shared ./packages/shared
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
WORKDIR /app/apps/api
EXPOSE 3093
# run pending migrations, then start
CMD ["sh", "-c", "npm run prisma:migrate && node dist/main.js"]
