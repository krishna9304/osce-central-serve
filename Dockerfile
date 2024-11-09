FROM node:18-slim AS builder
WORKDIR /usr/src/app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build

FROM node:18-slim AS production
WORKDIR /usr/src/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile --production

COPY --from=builder /usr/src/app/dist ./dist

ENV NODE_ENV production

EXPOSE 8080

USER node

CMD ["yarn", "start:prod"]