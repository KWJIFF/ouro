#!/bin/bash
# Ouro Docker Healthcheck
# Used by docker-compose health check configuration

set -e

# Check API health
response=$(curl -sf http://localhost:3001/api/health 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "UNHEALTHY: API not responding"
  exit 1
fi

# Check if meme is alive
meme=$(echo "$response" | python3 -c "import sys,json;print(json.load(sys.stdin).get('meme','dead'))" 2>/dev/null)
if [ "$meme" != "alive" ]; then
  echo "UNHEALTHY: Meme is $meme"
  exit 1
fi

echo "HEALTHY: Ouro is alive"
exit 0
