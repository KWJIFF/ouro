#!/bin/bash
set -e

echo "🐍 Ouro — The Self-Evolving Signal System"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Install from https://nodejs.org"; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "❌ PostgreSQL is required. Install with: brew install postgresql@16"; exit 1; }

# Check if PostgreSQL is running
pg_isready -q 2>/dev/null || {
  echo "⚠️  PostgreSQL is not running. Starting..."
  pg_ctlcluster 16 main start 2>/dev/null || pg_ctl -D /usr/local/var/postgresql@16 start 2>/dev/null || {
    echo "❌ Could not start PostgreSQL. Please start it manually."
    exit 1
  }
}

# Create database if not exists
psql -lqt 2>/dev/null | grep -q ouro || {
  echo "📦 Creating database 'ouro'..."
  createdb ouro 2>/dev/null || psql -c "CREATE DATABASE ouro" 2>/dev/null
}

# Install dependencies
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Run migrations
echo "📋 Running database migrations..."
psql -d ouro -f packages/server/src/db/migrations/0001_init.sql 2>/dev/null || true
psql -d ouro -f packages/server/src/db/migrations/0002_add_config_tables.sql 2>/dev/null || true

# Optional: start Redis
redis-server --daemonize yes 2>/dev/null && echo "📦 Redis started" || echo "ℹ️  Redis not available (optional, using memory cache)"

echo ""
echo "🚀 Starting Ouro server..."
echo ""

cd packages/server
exec npx tsx src/index.ts
