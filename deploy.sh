#!/bin/bash

PORT=1235

# Find container ID with port $PORT exposed
CONTAINER_ID=$(docker ps | grep $PORT | awk '{print $1}')

# Check if a container was found
if [ -z "$CONTAINER_ID" ]; then
  echo "No container found with port $PORT exposed."
  exit 1
fi

# Kill the container
echo "Killing container $CONTAINER_ID..."
docker kill "$CONTAINER_ID"

# Verify that the container is no longer running
if [ $? -eq 0 ]; then
  echo "Container successfully killed."
else
  echo "Failed to kill container."
  exit 1
fi

docker built -t nginx:custom-alipine-slim -f ./nginx-custom.alpine-slim.dockerfile .
docker built -t strnadi-web .
docker run -d -p $PORT:80 strnadi-web
