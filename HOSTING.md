# Hosting TTYT

Instructions for a Raspberry Pi 4 (though you could probably do the exact same thing on Ubuntu too).

```bash
cd scripts
bash install-caddy.sh
bash install-podman.sh
cd ..

pnpm i
pnpm migrate
pnpm build
pnpm migrate

cd tmail
pnpm build
cd ..

bash scripts/redeploy-container.sh

# podman images
# podman ps -a
```