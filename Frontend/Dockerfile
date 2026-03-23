FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_SERVER_URL=https://adda-backend.millatsakib.com
ENV VITE_SERVER_URL=$VITE_SERVER_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g serve@14.2.4

COPY --from=builder /app/dist ./dist

EXPOSE 80

CMD ["serve", "-s", "dist", "-l", "80"]
