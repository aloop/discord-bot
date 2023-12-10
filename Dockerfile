# Stage 1: install node packages
FROM node:20-bookworm AS node-modules

WORKDIR /app

RUN npm install -g pnpm

COPY package*.json .
COPY pnpm-lock.yaml .

ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile

# Stage 2: install apt packages and setup run command

FROM node:20-bookworm-slim

ENV NODE_ENV production

RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates fonts-inconsolata fonts-dejavu dumb-init && apt-get clean && rm -rf /var/lib/apt/lists/*

USER node
WORKDIR /app

COPY --chown=node:node . .
COPY --chown=node:node --from=node-modules /app/node_modules ./node_modules

EXPOSE 5000
CMD [ "dumb-init", "node", "index.js" ]
