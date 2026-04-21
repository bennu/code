FROM node:24-alpine3.22 AS deps
 
RUN apk add --no-cache libc6-compat
WORKDIR /app
 
RUN npm install -g pnpm
 
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
 
 
FROM node:24-alpine3.22 AS builder
WORKDIR /app
 
RUN npm install -g pnpm
 
COPY --from=deps /app/node_modules ./node_modules
COPY . .
 
RUN pnpm build
RUN cp -r .next/static .next/standalone/.next/static
 
 
FROM node:24-alpine3.22 AS runner
WORKDIR /app
 
ENV NODE_ENV=production
ENV PORT=3000
 
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
 
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
 
USER nextjs
 
EXPOSE 3000
 
CMD ["node", "server.js"]