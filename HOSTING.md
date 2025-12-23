# Hosting TTYT

Instructions for a Raspberry Pi 4 (though you could probably do the exact same thing on Ubuntu too).

```bash
cd scripts
bash install-caddy.sh
bash install-podman.sh

pnpm i
pnpm migrate
pnpm build
pnpm migrate

cd tmail
pnpm build

podman build -t ttyt .
# podman images
podman run -d --rm \
  --name ttyt \
  -p 8000:8000 \
  -v ./prisma:/app/prisma \
  -v ./node_modules:/app/node_modules \
  -v ./tmail/dist:/app/www \
  ttyt
# podman ps -a
```