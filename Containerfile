FROM node:20-alpine

WORKDIR /app

COPY dist/ ./dist
COPY README.md ./README.md

EXPOSE 8000

CMD ["node", "dist/index.js"]
