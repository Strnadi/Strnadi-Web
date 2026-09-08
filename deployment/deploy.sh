#!/bin/bash

set -euo pipefail

ENVIRONMENT="${1:-production}"

case "$ENVIRONMENT" in
  development|staging|production) ;;
  *)
    echo "Unsupported environment: $ENVIRONMENT" >&2
    echo "Usage: $0 [development|staging|production]" >&2
    exit 2
    ;;
esac

export ENVIRONMENT

# Reset to a clean state
git reset --hard

# Pull the latest changes, rebase if necessary (force push)
git pull --rebase

# Init & update submodules
git submodule update --remote --init --merge --recursive

docker compose -f docker-compose.yml build --no-cache
docker compose -f docker-compose.yml down
docker compose -f docker-compose.yml up -d
