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
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei \
    fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 gconf-service \ 
    libasound2 libatk1.0-0 libc6 libcairo2 \
    libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb-dri3-0 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 \
    libxss1 libxtst6 ca-certificates fonts-liberation libnss3 lsb-release \
    libxshmfence1 libxkbcommon0 libuuid1 libgbm1 libdrm2 libatspi2.0-0 libatk-bridge2.0-0 \
    xdg-utils --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/app ./
ENV PATH /usr/app/node_modules/.bin:$PATH
CMD yarn start:prod