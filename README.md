# documental-platform
levanta proyecto:
docker exec -it dp_postgres psql -U postgres -d documental_platform


pnpm --filter @documental/ms-auth build
pnpm --filter @documental/api-gateway start:dev

pnpm --filter @documental/ms-documentos build
pnpm --filter @documental/ms-documentos start:dev

pnpm --filter @documental/ms-auth build
pnpm --filter @documental/ms-auth start:dev


rm -rf apps/web-admin/.next
pnpm --filter web-admin build
pnpm --filter web-admin dev


source .venv/bin/activate
loxi1@Servidor-Ubuntu:~/projects/apps/documental-platform/workers/ocr-worker$ python -m app.main

loxi1@Servidor-Ubuntu:~/projects/apps/documental-platform/workers/ocr-worker$ python -m app.test_subscribe_clasificado
