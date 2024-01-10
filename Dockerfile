FROM node:latest AS base
WORKDIR /usr/app

FROM base AS build
COPY package.json yarn.lock ./
RUN yarn --prod
COPY . ./
RUN yarn add @nestjs/cli
RUN yarn build

FROM base
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/app ./
ENV PATH /usr/app/node_modules/.bin:$PATH
CMD yarn start:prod