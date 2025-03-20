#!/bin/bash

PORT=1235

# Find container ID with port $PORT exposed
CONTAINER_ID=$(docker ps | grep $PORT | awk '{print $1}')

# Check if a container was found
if [ ! -z "$CONTAINER_ID" ]; then
  docker kill "$CONTAINER_ID"

  if [ $? -eq 0 ]; then
    echo "Container successfully killed."
  else
    echo "Failed to kill container."
    exit 1
  fi
fi

docker build --build-arg ENABLED_MODULES="brotli" -t nginx:custom -f ./docker/nginx.dockerfile .
docker build -t strnadi-web -f ./docker/Dockerfile .
docker run -d -p $PORT:80 strnadi-web
