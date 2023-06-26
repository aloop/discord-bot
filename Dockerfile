FROM node:18-alpine AS base-install

RUN apk --no-cache add \
    ca-certificates \
    make \
    g++ \
    python3 \
    pkgconfig \
    cairo-dev \
    pango-dev \
    giflib-dev \
    jpeg-dev

RUN npm install -g pnpm

# Begin stage 2

FROM base-install AS install-packages

WORKDIR /app

COPY package.json ./
COPY pnpm-lock.yaml ./

ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile

# Begin stage 3

FROM node:18-alpine AS base

RUN apk --no-cache add \
    ca-certificates \
    ttf-inconsolata ttf-dejavu \
    cairo \
    pango \
    giflib \
    libjpeg

# Begin stage 4 (final)

FROM base AS bot

WORKDIR /app

COPY . .
COPY --from=install-packages /app/node_modules ./node_modules

EXPOSE 5000
ENV NODE_ENV=production
ENTRYPOINT ["node"]
CMD [ "." ]
