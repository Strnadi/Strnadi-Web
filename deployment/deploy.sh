#!/bin/bash

# Reset to a clean state
git reset --hard

# Pull the latest changes, rebase if necessary (force push)
git pull --rebase

# Init & update submodules
git submodule update --remote --init --merge --recursive

# Port is the first and only argument to this script
PORT=$1
ENVIRONMENT=$2

if [ -z "$PORT" ]; then
  echo "Error: PORT argument is required."
  exit 1
fi

if [ -z "$ENVIRONMENT" ]; then
  echo "Error: ENVIRONMENT argument is required."
  exit 1
fi

# Get the docker container ID that is bound to the specified port
CONTAINER_ID=$(docker ps --filter "publish=$PORT" -q)

# Check if a container was found
if [ -n "$CONTAINER_ID" ]; then
  docker kill "$CONTAINER_ID"

  if [ $? -eq 0 ]; then
    echo "Container successfully killed."
  else
    echo "Failed to kill container."
    exit 1
  fi
fi

docker build --build-arg ENABLED_MODULES="brotli" -t nginx:strnadi-custom -f ./docker/nginx.dockerfile .
docker build -t strnadi-web-$ENVIRONMENT --build-arg ENVIRONMENT=$ENVIRONMENT -f ./docker/Dockerfile .
docker run -d -p $PORT:80 strnadi-web-$ENVIRONMENT
