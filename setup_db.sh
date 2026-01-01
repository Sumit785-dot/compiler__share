#!/bin/bash
# Script to setup PostgreSQL database for Observer
echo "Setting up PostgreSQL database 'consoleshare_db' and user 'consoleshare_user'..."

# Create User
sudo -u postgres psql -c "CREATE USER consoleshare_user WITH PASSWORD 'dev_password';" || echo "User might already exist, skipping..."

# Create Database
sudo -u postgres psql -c "CREATE DATABASE consoleshare_db OWNER consoleshare_user;" || echo "Database might already exist, skipping..."

# Grant Privileges
sudo -u postgres psql -c "ALTER USER consoleshare_user CREATEDB;"

echo "Database setup complete!"
