#!/usr/bin/env bash
# ==============================================================================
# Goimomi Holidays - Full Server Provisioning & Setup Script
# Target OS: Ubuntu 22.04 / 24.04 LTS (AWS EC2 / VPS)
# Target: goimomi.com
# ==============================================================================

set -euo pipefail

echo "========================================================="
echo " 🚀 Starting Goimomi Server Bootstrap & Provisioning... "
echo "========================================================="

# 1. Update and upgrade Ubuntu system
echo "📦 [1/8] Updating system packages..."
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

# 2. Install essential dependencies and libraries (PDF, Image, Build tools)
echo "📦 [2/8] Installing build tools, Python, PostgreSQL, Redis, Nginx..."
sudo apt-get install -y \
    curl \
    git \
    unzip \
    zip \
    build-essential \
    software-properties-common \
    ufw \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    libpq-dev \
    postgresql \
    postgresql-contrib \
    redis-server \
    nginx \
    certbot \
    python3-certbot-nginx \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libjpeg-dev \
    zlib1g-dev \
    libffi-dev

# 3. Install Node.js 20.x LTS & npm
echo "📦 [3/8] Installing Node.js 20.x LTS..."
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1) != "v20" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 4. Configure PostgreSQL Database & User
echo "🗄️  [4/8] Setting up PostgreSQL Database..."
sudo systemctl enable postgresql
sudo systemctl start postgresql

DB_NAME="goimomi_db"
DB_USER="goimomi_user"
DB_PASS="DCXServer321$"

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"

sudo -u postgres psql -c "ALTER ROLE $DB_USER SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE $DB_USER SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE $DB_USER SET timezone TO 'UTC';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER SCHEMA public OWNER TO $DB_USER;"

# 5. Configure Redis Server
echo "⚡ [5/8] Enabling & Starting Redis..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

# 6. Create Directories & Set Permissions
echo "📁 [6/8] Creating deployment directories & log paths..."
sudo mkdir -p /var/log/gunicorn /var/log/celery /var/log/nginx
sudo chown -R ubuntu:www-data /var/log/gunicorn /var/log/celery
sudo chmod -R 775 /var/log/gunicorn /var/log/celery

mkdir -p /home/ubuntu/goimomi
mkdir -p /home/ubuntu/backups
sudo chown -R ubuntu:ubuntu /home/ubuntu/goimomi /home/ubuntu/backups

# 7. Configure Firewall (UFW)
echo "🛡️  [7/8] Configuring UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 8. Copy Systemd and Nginx configs if present
echo "⚙️  [8/8] Installing Service & Nginx configurations..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/goimomi.service" ]; then
    sudo cp "$SCRIPT_DIR/goimomi.service" /etc/systemd/system/goimomi.service
fi
if [ -f "$SCRIPT_DIR/goimomi-celery.service" ]; then
    sudo cp "$SCRIPT_DIR/goimomi-celery.service" /etc/systemd/system/goimomi-celery.service
fi
if [ -f "$SCRIPT_DIR/goimomi-beat.service" ]; then
    sudo cp "$SCRIPT_DIR/goimomi-beat.service" /etc/systemd/system/goimomi-beat.service
fi

sudo systemctl daemon-reload

if [ -f "$SCRIPT_DIR/nginx-goimomi.conf" ]; then
    sudo cp "$SCRIPT_DIR/nginx-goimomi.conf" /etc/nginx/sites-available/goimomi
    sudo ln -sf /etc/nginx/sites-available/goimomi /etc/nginx/sites-enabled/goimomi
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t && sudo systemctl reload nginx
fi

echo "========================================================="
echo " ✅ Server Provisioning Completed Successfully!"
echo " Next step: Deploy the application code using deploy.sh "
echo "========================================================="

