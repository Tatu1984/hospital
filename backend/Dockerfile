FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

RUN bun install
RUN bun prisma generate

COPY . .
RUN bun run build

EXPOSE 4000

CMD ["bun", "run", "start"]
