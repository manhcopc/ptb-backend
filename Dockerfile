




FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# Install FFmpeg
RUN apk add --no-cache ffmpeg

RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start:prod"]
