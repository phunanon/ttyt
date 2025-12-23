pnpm build
podman build -t ttyt .
podman stop ttyt
podman run -d --rm \
  --name ttyt \
  -p 8000:8000 \
  -v ./prisma:/app/prisma \
  -v ./node_modules:/app/node_modules \
  -v ./tmail/dist:/app/www \
  ttyt