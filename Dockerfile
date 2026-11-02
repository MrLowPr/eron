# ─────────────────────────────────────────────────────────────────────────────
# Eron — production multi-stage build (Next.js standalone output)
# ─────────────────────────────────────────────────────────────────────────────

FROM node:22-alpine AS base
WORKDIR /app

# ---------- deps: install + prisma generate ----------
FROM base AS deps
# Salin schema SEBELUM `npm ci`: postinstall @prisma/client menjalankan
# `prisma generate` dan butuh prisma/schema.prisma di dalam image.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# ---------- build: next build (standalone) ----------
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx next build

# ---------- runtime: minimal image ----------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Standalone server
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Runtime uploads live here — mount a volume on /app/public/uploads
RUN mkdir -p /app/public/uploads && chown -R nextjs:nodejs /app/public/uploads

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
