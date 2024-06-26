ARG NODE_VERSION=20.14.0


FROM node:${NODE_VERSION}-alpine AS dependencies
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN npm install --production

RUN npm install pm2 --location=global

COPY --from=builder /app/dist ./

RUN adduser --disabled-password gs1-integrations
RUN chown -R gs1-integrations:gs1-integrations ./
USER gs1-integrations

EXPOSE 3000

CMD ["pm2-runtime", "main.js"]
