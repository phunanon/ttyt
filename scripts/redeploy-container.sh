#!/bin/bash
set -x
pnpm build
podman stop ttyt
podman rm ttyt
podman build -t ttyt .
podman run -d \
  --name ttyt \
  -p 8000:8000 \
  -v ./prisma:/app/prisma \
  -v ./tmail/dist:/app/www \
  ttyt
# podman image prune