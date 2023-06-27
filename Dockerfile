FROM node:20 AS install-packages

WORKDIR /app

RUN npm install -g pnpm

COPY package.json ./
COPY pnpm-lock.yaml ./

ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile

# Begin stage 2

FROM node:20 AS base

RUN apt-get update && apt-get install -y \
   ca-certificates \
   fonts-inconsolata \
   fonts-dejavu \
&& rm -rf /var/lib/apt/lists/*

# Begin stage 3 (final)

FROM base AS discord-bot

WORKDIR /app

COPY . .
COPY --from=install-packages /app/node_modules ./node_modules

EXPOSE 5000
ENV NODE_ENV=production
CMD [ "node" "index.js" ]
