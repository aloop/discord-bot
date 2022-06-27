FROM node:18-alpine as build

WORKDIR /app

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

COPY package.json ./
COPY pnpm-lock.yaml ./

RUN pnpm config set store-dir /pnpm

ENV NODE_ENV=production
RUN pnpm install --prod --frozen-lockfile

# Begin stage 2

FROM node:18-alpine

WORKDIR /app

RUN apk --no-cache add \
    ca-certificates \
    ttf-inconsolata ttf-dejavu \
    cairo \
    pango \
    giflib \
    libjpeg

RUN npm install -g pnpm
RUN pnpm config set store-dir /pnpm

COPY --from=build /pnpm /pnpm
COPY --from=build /app ./
COPY . .

EXPOSE 5000
ENV NODE_ENV=production
ENTRYPOINT ["pnpm"]
CMD [ "run", "serve" ]
