# syntax=docker/dockerfile:1

############################
# deps — instala dependencias com lockfile
############################
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

############################
# builder — build de producao (NEXT_PUBLIC_* inlined no bundle do client)
############################
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variaveis publicas usadas em build-time (substituem as do .env.local local).
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://api.animesice.app/api}
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL:-https://animesice.app}
ARG NEXT_PUBLIC_TURNSTILE_SITEKEY
ENV NEXT_PUBLIC_TURNSTILE_SITEKEY=${NEXT_PUBLIC_TURNSTILE_SITEKEY:-0x4AAAAAAEJ2yW0QjDiK6Rmj}
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ENV NEXT_PUBLIC_ADSENSE_CLIENT=${NEXT_PUBLIC_ADSENSE_CLIENT:-ca-pub-2885915887212760}
ARG INCLUDE_LOCAL_API
ENV INCLUDE_LOCAL_API=${INCLUDE_LOCAL_API:-0}
ARG NEXT_PUBLIC_ENABLE_MONETAG
ENV NEXT_PUBLIC_ENABLE_MONETAG=${NEXT_PUBLIC_ENABLE_MONETAG:-0}

RUN npm run build

############################
# runner — servidor Next standalone (minimo, pronto pra prod)
############################
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
