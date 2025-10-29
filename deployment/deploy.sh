#!/bin/bash

# Reset to a clean state
git reset --hard

# Pull the latest changes, rebase if necessary (force push)
git pull --rebase

# Init & update submodules
git submodule update --remote --init --merge --recursive

# Port is the first and only argument to this script
ENVIRONMENT=$1

docker compose -f docker-compose.yml build --no-cache
docker compose -f docker-compose.yml down
docker compose -f docker-compose.yml up -d
