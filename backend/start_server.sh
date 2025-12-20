#!/bin/bash

# ==========================================
# CodeMonitor Backend Startup Script
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
echo "Starting CodeMonitor Backend..."
echo "Admin User: $GITHUB_ADMIN_USERNAME"



# Run database migrations just in case
cd backend
source venv/bin/activate
python3 manage.py migrate

# Start the server
python3 manage.py runserver 0.0.0.0:8000
