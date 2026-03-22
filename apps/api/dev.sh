#!/bin/sh
# Dev local: injeta a URL direta do Neon como localConnectionString do Hyperdrive
# O wrangler transforma WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE
# em env.HYPERDRIVE.connectionString para o Worker usar pg diretamente
DB_URL=$(grep -m1 "^DATABASE_URL=" ../.env | cut -d '"' -f2)
WRANGLER_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE="$DB_URL" \
  wrangler dev
