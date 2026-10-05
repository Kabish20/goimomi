import sys
import os
import time
import datetime
import tarfile
import paramiko
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

print("=" * 60)
print("GOIMOMI PRODUCTION REHOSTING - 172.105.47.106")
print("=" * 60)

base_dir = Path(r'd:\DCX PROJECTS\G')
tmp_dir = base_dir / '.release_tmp'
tmp_dir.mkdir(parents=True, exist_ok=True)

backend_dir = base_dir / 'goimomibackend'
frontend_dist = base_dir / 'goimomifrontend' / 'dist'

backend_tar = tmp_dir / 'backend_release.tar.gz'
dist_tar = tmp_dir / 'dist_release_app.tar.gz'

# 1. Package Backend
print("\n[Step 1/5] Packaging Backend...")
def backend_filter(tarinfo):
    parts = Path(tarinfo.name).parts
    exclude = {'.git', '__pycache__', 'venv', '.env', 'media', 'node_modules', '.pytest_cache'}
    if any(p in exclude for p in parts) or tarinfo.name.endswith('.pyc'):
        return None
    return tarinfo

with tarfile.open(backend_tar, 'w:gz') as tar:
    tar.add(str(backend_dir), arcname='goimomibackend', filter=backend_filter)
print(f"  Backend archive created: {backend_tar.stat().st_size / 1024 / 1024:.2f} MB")

# 2. Package Frontend Dist (excluding images to optimize transfer; server retains existing images)
print("\n[Step 2/5] Packaging Frontend...")
if not frontend_dist.exists() or not (frontend_dist / 'index.html').exists():
    print("  ERROR: Frontend dist not found! Run npm run build first.")
    sys.exit(1)

def dist_filter(tarinfo):
    parts = Path(tarinfo.name).parts
    if 'images' in parts:
        return None
    return tarinfo

with tarfile.open(dist_tar, 'w:gz') as tar:
    tar.add(str(frontend_dist), arcname='dist', filter=dist_filter)
print(f"  Frontend archive created: {dist_tar.stat().st_size / 1024 / 1024:.2f} MB")

SERVER_IP = '172.105.47.106'
SERVER_USER = 'root'
SERVER_PASS = 'goimomi@123$'

# 3. Connect to SSH
print(f"\n[Step 3/5] Connecting to Server {SERVER_IP}...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

connected = False
for attempt in range(1, 11):
    try:
        print(f"  Attempt {attempt}/10: Connecting to {SERVER_IP}:22...")
        ssh.connect(SERVER_IP, username=SERVER_USER, password=SERVER_PASS, timeout=8)
        connected = True
        print("  Connected successfully!")
        break
    except Exception as e:
        print(f"  Attempt {attempt} failed: {e}")
        if attempt < 10:
            print("  Retrying in 5 seconds...")
            time.sleep(5)

if not connected:
    print(f"\nERROR: Could not establish SSH connection to {SERVER_IP}:22 after 10 attempts.")
    print("Please verify in Linode Cloud Manager that the VPS is Powered On and not blocked by a Cloud Firewall.")
    sys.exit(1)


stamp = datetime.datetime.now().strftime('%Y%m%dT%H%M%S')
backup_dir = f"/var/backups/goimomi/rehost-release-{stamp}"

# Server-side Pre-deploy Backup
print(f"  Creating database & runtime backup in {backup_dir}...")
backup_cmds = f"""
mkdir -p {backup_dir}
runuser -u postgres -- pg_dump -Fc goimomi_db > {backup_dir}/goimomi_db_{stamp}.dump
tar -czf {backup_dir}/runtime_{stamp}.tar.gz --exclude=media --exclude=__pycache__ -C /var/www/goimomi goimomibackend goimomifrontend/dist
ls -lh {backup_dir}/
"""
stdin, stdout, stderr = ssh.exec_command(backup_cmds)
print("  Backup output:\n" + stdout.read().decode('utf-8'))

# 4. Upload Archives via SFTP
print("\n[Step 4/5] Uploading release archives via SFTP...")
sftp = ssh.open_sftp()
t0 = time.time()
sftp.put(str(backend_tar), '/tmp/backend_release.tar.gz')
sftp.put(str(dist_tar), '/tmp/dist_release_app.tar.gz')
sftp.close()
print(f"  Upload completed in {time.time() - t0:.2f}s")

# 5. Execute Remote Rehost Deployment
print("\n[Step 5/5] Executing Remote Rehosting on Server...")
deploy_cmds = f"""set -e
root="/var/www/goimomi"
backend="$root/goimomibackend"
frontend="$root/goimomifrontend"
py="/var/www/goimomi-venv/bin/python"
pip="/var/www/goimomi-venv/bin/pip"

echo "--> 1. Syncing backend codebase..."
rm -rf /tmp/stage_backend && mkdir -p /tmp/stage_backend
tar -xzf /tmp/backend_release.tar.gz -C /tmp/stage_backend
cp -r /tmp/stage_backend/goimomibackend/* "$backend/"

echo "--> 2. Configuring server_settings.py..."
cat << 'EOF' > "$backend/backend/server_settings.py"
import sys
from .settings import *

# Redis Caching (Production)
CACHES = {{
    'default': {{
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'TIMEOUT': 86400,
    }}
}}

if 'test' not in sys.argv:
    SECURE_SSL_REDIRECT = True
else:
    SECURE_SSL_REDIRECT = False

CSRF_TRUSTED_ORIGINS = [
    'https://goimomi.com',
    'https://www.goimomi.com',
    'http://172.105.47.106',
]
ALLOWED_HOSTS = [
    '172.105.47.106',
    'goimomi.com',
    'www.goimomi.com',
    'localhost',
    '127.0.0.1',
    '54.81.116.105',
]
EOF

echo "--> 3. Checking dependencies & running Django migrations..."
$pip install -r "$backend/requirements.txt" --quiet
cd "$backend"
$py manage.py check --settings=backend.server_settings
$py manage.py migrate --noinput --settings=backend.server_settings
$py manage.py collectstatic --noinput --settings=backend.server_settings --verbosity=0

echo "--> 4. Syncing frontend dist..."
rm -rf /tmp/stage_dist && mkdir -p /tmp/stage_dist
tar -xzf /tmp/dist_release_app.tar.gz -C /tmp/stage_dist

# Retain existing images
if [ -d "$frontend/dist/images" ]; then
    mkdir -p /tmp/stage_dist/dist/images
    cp -rn "$frontend/dist/images/"* /tmp/stage_dist/dist/images/ || true
fi

# Backup old dist and swap
if [ -d "$frontend/dist" ]; then
    mv "$frontend/dist" "$frontend/dist-backup-{stamp}"
fi
mv /tmp/stage_dist/dist "$frontend/dist"

echo "--> 5. Ensuring Gunicorn systemd unit with gthread concurrency..."
cat << 'EOF' > /etc/systemd/system/goimomi.service
[Unit]
Description=Goimomi Django API
After=network.target postgresql.service redis-server.service

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/var/www/goimomi/goimomibackend
Environment=DJANGO_SETTINGS_MODULE=backend.server_settings
ExecStart=/var/www/goimomi-venv/bin/gunicorn --workers 3 --threads 4 --worker-class gthread --worker-tmp-dir /dev/shm --bind 127.0.0.1:8000 --timeout 120 --access-logfile - --error-logfile - backend.wsgi:application
Restart=on-failure
RestartSec=5
UMask=0027
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo "--> 6. Ensuring Nginx reverse proxy configuration..."
cat << 'EOF' > /etc/nginx/sites-available/goimomi
# ==============================================================================
# Goimomi Holidays - Production Nginx Configuration
# ==============================================================================

server {{
    server_name goimomi.com www.goimomi.com;

    server_tokens off;
    proxy_hide_header Strict-Transport-Security;
    proxy_hide_header X-Content-Type-Options;
    proxy_hide_header Referrer-Policy;
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    client_max_body_size 50M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    location ~ ^/(holiday|visa/apply)/[^/]+/?$ {{
        rewrite ^/(.*)/?$ /api/share/$1/ break;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }}

    # 1. Frontend React (Vite SPA)
    location = /index.html {{
        root /var/www/goimomi/goimomifrontend/dist;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Expires "0" always;
    }}

    location / {{
        root /var/www/goimomi/goimomifrontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        location ~* \\.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|woff|woff2|ttf)$ {{
            expires 30d;
            add_header Cache-Control "public, max-age=2592000, immutable";
            access_log off;
        }}
    }}

    # 2. Django Backend REST API
    location /api/ {{
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
    }}

    # 3. Django Management / Admin Panel
    location /management/ {{
        proxy_pass http://127.0.0.1:8000/management/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 120s;
    }}

    # 4. Payment Gateway Callbacks & Webhooks
    location /payment/ {{
        proxy_pass http://127.0.0.1:8000/payment/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }}

    # 5. Django Backend Static Files
    location /static/ {{
        alias /var/www/goimomi/goimomibackend/static/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }}

    # 6. Django Uploaded Media Files
    location /media/ {{
        alias /var/www/goimomi/goimomibackend/media/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }}

    error_log /var/log/nginx/goimomi_error.log warn;
    access_log /var/log/nginx/goimomi_access.log;

    listen [::]:443 ssl ipv6only=on;
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/goimomi.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/goimomi.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}}

server {{
    listen 80;
    listen [::]:80;
    server_name goimomi.com www.goimomi.com 172.105.47.106;
    server_tokens off;
    return 301 https://goimomi.com$request_uri;
}}
EOF

echo "--> 7. Setting correct permissions..."
chown -R ubuntu:www-data "$root"
chmod -R 755 "$root"
chmod 600 "$backend/.env"
if [ -d "$backend/media" ]; then
    chmod -R 775 "$backend/media"
fi

echo "--> 8. Testing configurations & restarting services..."
nginx -t
systemctl daemon-reload
systemctl restart goimomi.service goimomi-enquiries.service
systemctl reload nginx

# Flush Redis cache database 1
redis-cli -n 1 flushdb

echo "--> 9. Checking active service status..."
systemctl is-active goimomi.service goimomi-enquiries.service nginx postgresql redis-server

# Clean /tmp
rm -rf /tmp/stage_backend /tmp/stage_dist /tmp/backend_release.tar.gz /tmp/dist_release_app.tar.gz
echo "Rehosting deployment finished successfully!"
"""

stdin, stdout, stderr = ssh.exec_command(deploy_cmds, get_pty=True)
for line in iter(stdout.readline, ""):
    print(line, end='', flush=True)

exit_status = stdout.channel.recv_exit_status()
print(f"\nRehost execution exit code: {exit_status}")
ssh.close()

if exit_status != 0:
    print("Rehosting failed! Check errors above.")
    sys.exit(exit_status)

print("\n" + "=" * 60)
print("REHOSTING COMPLETED SUCCESSFULLY!")
print("=" * 60)
