#!/usr/bin/env bash
# ==============================================================================
# Goimomi Holidays - Automated Application Deployment Script
# Runs on: Production Ubuntu Server
# Path: /home/ubuntu/goimomi/scripts/deployment/deploy.sh
# ==============================================================================

set -euo pipefail

APP_ROOT="/home/ubuntu/goimomi"
BACKEND_DIR="$APP_ROOT/goimomibackend"
FRONTEND_DIR="$APP_ROOT/goimomifrontend"

echo "========================================================="
echo " 🚀 Deploying Goimomi Application... "
echo "========================================================="

# 1. Unpack update_package.zip if present in /home/ubuntu
if [ -f "/home/ubuntu/update_package.zip" ]; then
    echo "📦 Unpacking /home/ubuntu/update_package.zip..."
    unzip -qo /home/ubuntu/update_package.zip -d "$APP_ROOT"
fi

if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Error: Backend directory $BACKEND_DIR does not exist!"
    exit 1
fi

if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Error: Frontend directory $FRONTEND_DIR does not exist!"
    exit 1
fi

# 2. Setup Python Virtual Environment & Install Dependencies
echo "🐍 [1/5] Setting up Backend Virtualenv & Dependencies..."
cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Ensure .env exists
if [ ! -f ".env" ]; then
    if [ -f "/home/ubuntu/.env" ]; then
        cp /home/ubuntu/.env .env
    elif [ -f ".env.example" ]; then
        cp .env.example .env
        echo "⚠️ Warning: Created default .env from .env.example. Please update credentials!"
    fi
fi

# 3. Run Database Migrations & Static Collection
echo "🗄️  [2/5] Running Migrations & Collecting Static Files..."
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# Run custom data fixing commands if applicable
echo "🔧 Fixing vehicle and package media references..."
python manage.py fix_vehicle_images || true
python manage.py fix_package_images || true

# 4. Build Frontend (React + Vite)
echo "⚛️  [3/5] Building React Vite Frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build

# 5. Fix permissions for Nginx and Gunicorn
echo "🔒 [4/5] Setting permissions for media and static directories..."
sudo chown -R ubuntu:www-data "$APP_ROOT"
sudo chmod -R 755 "$APP_ROOT"
mkdir -p "$BACKEND_DIR/media"
sudo chmod -R 775 "$BACKEND_DIR/media"

# 6. Restart Backend Services & Nginx
echo "🔄 [5/5] Restarting Gunicorn, Celery, and Nginx..."
sudo systemctl daemon-reload
sudo systemctl restart goimomi.service
sudo systemctl restart goimomi-celery.service || true
sudo systemctl restart goimomi-beat.service || true
sudo systemctl reload nginx

echo "========================================================="
echo " ✅ Deployment Completed Successfully!"
echo " Backend Status: $(sudo systemctl is-active goimomi.service)"
echo " Celery Status:  $(sudo systemctl is-active goimomi-celery.service 2>/dev/null || echo 'inactive')"
echo " Nginx Status:   $(sudo systemctl is-active nginx)"
echo "========================================================="

