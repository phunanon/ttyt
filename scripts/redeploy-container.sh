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
  -v ./node_modules:/app/node_modules \
  -v ./tmail/dist:/app/www \
  ttyt
