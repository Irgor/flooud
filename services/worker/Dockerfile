FROM node:22-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
COPY --parents packages/*/package.json ./
COPY services/worker/package.json services/worker/

RUN npm install

COPY packages packages/
COPY services/worker services/worker/

CMD ["npm", "start", "-w", "worker"]
