FROM node:22-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
# Migrations need the live database, which is not reachable while the image builds.
RUN GPI_RAILWAY=1 GPI_SKIP_MIGRATE=1 npm run build

ENV HOST=0.0.0.0
ENV NITRO_HOST=0.0.0.0
ENV NODE_ENV=production

CMD ["npm", "start"]
