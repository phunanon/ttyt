FROM node:20 AS build

WORKDIR /app

COPY . .
RUN corepack enable
RUN pnpm install --frozen-lockfile
RUN pnpm build


FROM node:20-slim AS production

WORKDIR /app

COPY README.md ./README.md
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 8000

CMD ["node", "dist/index.js"]
