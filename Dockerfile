FROM node:20-alpine

WORKDIR /app

# Copy Next.js standalone output (traced server deps, server chunks, DB)
COPY .next/standalone/inventory-app ./

# Copy client-side static assets from root build
COPY .next/static ./.next/static

# Copy public assets
COPY ./public ./public

# Ensure data directory (SQLite) exists
RUN mkdir -p /app/data && chown -R node:node /app/data

# Switch to non-root user for security
USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

CMD ["node", "server.js"]
