# Multi-stage Next.js + Prisma build for self-hosting.
# Use with the bundled docker-compose.yml — see docs/self-hosting.

FROM node:22-alpine AS builder
WORKDIR /app

# Cache deps separately from sources.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# Build (npm run build runs `prisma generate` first).
COPY . .
RUN npm run build


FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Run as a non-root user.
RUN addgroup -S nodejs && adduser -S jellybox -G nodejs

# Bring node_modules + build artefacts + Prisma schema from the builder.
# We keep the full node_modules tree so the prisma CLI is available for
# `prisma migrate deploy` at container start.
COPY --from=builder --chown=jellybox:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=jellybox:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=jellybox:nodejs /app/.next ./.next
COPY --from=builder --chown=jellybox:nodejs /app/public ./public
COPY --from=builder --chown=jellybox:nodejs /app/prisma ./prisma

USER jellybox
EXPOSE 3000

# Apply pending migrations on every start, then boot Next.
CMD ["sh", "-c", "npx prisma migrate deploy && node node_modules/next/dist/bin/next start"]
