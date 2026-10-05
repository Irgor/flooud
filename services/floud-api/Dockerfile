FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
COPY --parents packages/*/package.json ./
COPY services/floud-api/package.json services/floud-api/

RUN npm install

COPY packages packages/
COPY services/floud-api services/floud-api/

EXPOSE 3000

CMD ["npm", "start", "-w", "floud-api"]
