#!/usr/bin/env bash
# ==============================================================================
# Goimomi Holidays - Quick Update Script for Remote Server
# Run on remote server: bash update_server.sh
# ==============================================================================

set -euo pipefail

echo "📦 Extracting update_package.zip..."
unzip -o -q /home/ubuntu/update_package.zip -d /home/ubuntu/goimomi

cd /home/ubuntu/goimomi/goimomibackend

# Ensure production DEBUG setting is disabled
if [ -f ".env" ]; then
    python3 -c "import os; p = '.env'; c = open(p).read(); open(p, 'w').write(c.replace('DEBUG=True', 'DEBUG=False'))"
    cp .env /home/ubuntu/.env
fi

# Backend update
echo "🐍 Updating backend dependencies, migrations, and static assets..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py fix_vehicle_images || true
python manage.py fix_package_images || true

# Frontend update
echo "⚛️  Building React Vite frontend bundle..."
cd /home/ubuntu/goimomi/goimomifrontend
npm install
npm run build

# Permissions and Service restarts
echo "🔄 Setting permissions and restarting services..."
sudo chown -R ubuntu:www-data /home/ubuntu/goimomi
sudo chmod -R 755 /home/ubuntu/goimomi
mkdir -p /home/ubuntu/goimomi/goimomibackend/media
sudo chmod -R 775 /home/ubuntu/goimomi/goimomibackend/media

sudo systemctl daemon-reload
sudo systemctl restart goimomi.service
sudo systemctl restart goimomi-celery.service 2>/dev/null || true
sudo systemctl restart goimomi-beat.service 2>/dev/null || true
sudo systemctl reload nginx

echo "✅ Server updated successfully!"
