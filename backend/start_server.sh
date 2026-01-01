#!/bin/bash

# ==========================================
# Observer Backend Startup Script
# ==========================================

# ------------------------------------------
# 1. ADMIN CONFIGURATION (REQUIRED)
# ------------------------------------------
# Enter your GitHub username here
export GITHUB_ADMIN_USERNAME="Sumit785-dot"

# Enter your GitHub Personal Access Token here
# HOW TO GET TOKEN:
# 1. Go to GitHub Settings -> Developer Settings -> Personal access tokens -> Tokens (classic)
# 2. Generate new token
# 3. Select 'repo' scope (Full control of private repositories)
# 4. Copy the token and paste it below
export GITHUB_ADMIN_TOKEN="YOUR_GITHUB_TOKEN_HERE"

# ------------------------------------------
# 2. START SERVER
# ------------------------------------------
echo "Starting Observer Backend..."
echo "Admin User: $GITHUB_ADMIN_USERNAME"



# Run database migrations just in case
# Ensure we are in the backend directory
cd "$(dirname "$0")"

# Start Database (Docker/Podman directly)
echo "Starting Database..."

# Load environment variables from .env if present (used for docker container too)
if [ -f ../.env ]; then
    set -a
    source ../.env
    set +a
fi

DB_USER=${POSTGRES_USER:-consoleshare_user}
DB_PASS=${POSTGRES_PASSWORD:-consoleshare_password}
DB_NAME=${POSTGRES_DB:-consoleshare}

# Remove existing container to ensure config update (e.g. auth method)
docker rm -f consoleshare-db >/dev/null 2>&1 || true

# Run new container
docker run -d \
    --name consoleshare-db \
    --restart unless-stopped \
    -p 127.0.0.1:5434:5432 \
    -e POSTGRES_USER=$DB_USER \
    -e POSTGRES_PASSWORD=$DB_PASS \
    -e POSTGRES_DB=$DB_NAME \
    -e POSTGRES_HOST_AUTH_METHOD=trust \
    -v postgres_data:/var/lib/postgresql/data \
    postgres:15-alpine

# Load environment variables from .env if present
if [ -f ../.env ]; then
    set -a
    source ../.env
    set +a
fi

# Force connection to local Docker DB (overriding potentially incorrect .env port)
# Use credentials from .env but force localhost:5434
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:5434/${DB_NAME}"

# Build Frontend
echo "Building Frontend..."
cd ../frontend
npm install
npm run build
cd ../backend

# Run database migrations just in case
source venv/bin/activate
python3 manage.py migrate
python3 manage.py collectstatic --noinput

# Start the server with Daphne (Production-ready)
echo "Starting Daphne Server on 0.0.0.0:8000..."
daphne -b 0.0.0.0 -p 8000 config.asgi:application
