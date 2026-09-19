# ---- base ----
FROM node:20-slim AS base
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN npm install
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# ---- dev (hot reload; source bind-mounted by compose) ----
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 5103
CMD ["npm", "run", "dev", "-w", "@lprms/web", "--", "--host", "0.0.0.0"]

# ---- build ----
FROM base AS build
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build -w @lprms/web

# ---- production (static via nginx) ----
FROM nginx:alpine AS prod
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
