FROM node:lts-alpine3.19 AS build
WORKDIR /app
COPY package*.json ./

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      yarn
# Tell Puppeteer to skip installing Chrome. We'll be using the installed package.
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]