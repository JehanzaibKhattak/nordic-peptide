FROM node:24-bookworm-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
ARG NEXT_PUBLIC_INVENTORY_MODE=online
ENV NEXT_PUBLIC_INVENTORY_MODE=$NEXT_PUBLIC_INVENTORY_MODE
ARG NEXT_PUBLIC_BROWSE_ONLY=true
ARG NEXT_PUBLIC_DEMO_CHECKOUT=true
ARG NEXT_PUBLIC_AVION_CHECKOUT=false
ARG NEXT_PUBLIC_UK_ONLY_SHIPPING=false
ENV NEXT_PUBLIC_UK_ONLY_SHIPPING=$NEXT_PUBLIC_UK_ONLY_SHIPPING NEXT_PUBLIC_BROWSE_ONLY=$NEXT_PUBLIC_BROWSE_ONLY NEXT_PUBLIC_DEMO_CHECKOUT=$NEXT_PUBLIC_DEMO_CHECKOUT NEXT_PUBLIC_AVION_CHECKOUT=$NEXT_PUBLIC_AVION_CHECKOUT STORE_BASE_URL=https://peptbay.com NEXT_TELEMETRY_DISABLED=1
RUN pnpm exec prisma generate --config prisma/postgresql.config.ts && pnpm exec next build --webpack

FROM node:24-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
