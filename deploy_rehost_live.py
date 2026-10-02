import sys
import time
import datetime
import paramiko
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

tmp_dir = Path(r'd:\DCX PROJECTS\G\.release_tmp')
backend_tar = tmp_dir / 'backend_release.tar.gz'
dist_tar = tmp_dir / 'dist_release_app.tar.gz'

if not backend_tar.exists() or not dist_tar.exists():
    print("Error: Release archives not found in .release_tmp")
    sys.exit(1)

print("Connecting to 172.105.47.106 via SSH...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.105.47.106', username='root', password='goimomi@123$', timeout=30)
print("Connected successfully.")

stamp = datetime.datetime.now().strftime('%Y%m%dT%H%M%S')
backup_dir = f"/var/backups/goimomi/rehost-release-{stamp}"

# 1. Server-side Pre-deploy Backup
print(f"Step 1: Creating database and runtime backups on server in {backup_dir}...")
backup_cmds = f"""
mkdir -p {backup_dir}
runuser -u postgres -- pg_dump -Fc goimomi_db > {backup_dir}/goimomi_db_{stamp}.dump
ls -lh {backup_dir}/goimomi_db_{stamp}.dump
tar -czf {backup_dir}/runtime_{stamp}.tar.gz --exclude=media --exclude=__pycache__ -C /var/www/goimomi goimomibackend goimomifrontend/dist
ls -lh {backup_dir}/runtime_{stamp}.tar.gz
"""
stdin, stdout, stderr = ssh.exec_command(backup_cmds)
print(stdout.read().decode('utf-8'))
err = stderr.read().decode('utf-8').strip()
if err:
    print("Backup notes/warnings:", err)

# 2. Upload Archives via SFTP
sftp = ssh.open_sftp()
print(f"Step 2: Uploading backend_release.tar.gz ({backend_tar.stat().st_size / 1024 / 1024:.2f} MB)...")
t0 = time.time()
sftp.put(str(backend_tar), '/tmp/backend_release.tar.gz')
print(f"Backend upload complete in {time.time() - t0:.2f}s")

print(f"Uploading dist_release_app.tar.gz ({dist_tar.stat().st_size / 1024 / 1024:.2f} MB)...")
t0 = time.time()
sftp.put(str(dist_tar), '/tmp/dist_release_app.tar.gz')
print(f"Frontend dist upload complete in {time.time() - t0:.2f}s")
sftp.close()

# 3. Server-side Deployment Script Execution
print("Step 3: Extracting and deploying updates on server...")
deploy_cmds = f"""set -e
root="/var/www/goimomi"
backend="$root/goimomibackend"
frontend="$root/goimomifrontend"
py="/var/www/goimomi-venv/bin/python"
pip="/var/www/goimomi-venv/bin/pip"

# Stage backend
echo "Extracting backend..."
rm -rf /tmp/stage_backend && mkdir -p /tmp/stage_backend
tar -xzf /tmp/backend_release.tar.gz -C /tmp/stage_backend

# Copy backend files (preserving server_settings.py, .env, media)
echo "Syncing backend code..."
cp -r /tmp/stage_backend/goimomibackend/* "$backend/"

# Ensure server_settings.py exists
cat << 'EOF' > "$backend/backend/server_settings.py"
from .settings import *

SECURE_SSL_REDIRECT = True
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

# Install any requirements updates
echo "Checking requirements..."
$pip install -r "$backend/requirements.txt" --quiet

# Run checks, migrations, collectstatic
echo "Running Django migrations and collectstatic..."
cd "$backend"
$py manage.py check --settings=backend.server_settings
$py manage.py migrate --noinput --settings=backend.server_settings
$py manage.py collectstatic --noinput --settings=backend.server_settings --verbosity=0

# Stage frontend
echo "Extracting frontend..."
rm -rf /tmp/stage_dist && mkdir -p /tmp/stage_dist
tar -xzf /tmp/dist_release_app.tar.gz -C /tmp/stage_dist

# Retain existing images
if [ -d "$frontend/dist/images" ]; then
    echo "Retaining existing dist/images..."
    mkdir -p /tmp/stage_dist/dist/images
    cp -rn "$frontend/dist/images/"* /tmp/stage_dist/dist/images/ || true
fi

# Swap frontend dist
echo "Swapping frontend dist..."
if [ -d "$frontend/dist" ]; then
    mv "$frontend/dist" "$frontend/dist-previous-{stamp}"
fi
mv /tmp/stage_dist/dist "$frontend/dist"

# Set permissions
echo "Setting permissions..."
chown -R ubuntu:www-data "$root"
chmod -R 755 "$root"
chmod 600 "$backend/.env"
if [ -d "$backend/media" ]; then
    chmod -R 775 "$backend/media"
fi

# Verify Nginx and restart services
echo "Restarting services..."
nginx -t
systemctl restart goimomi.service goimomi-enquiries.service
systemctl reload nginx

# Check service status
systemctl is-active goimomi.service goimomi-enquiries.service nginx postgresql redis-server

# Clean up /tmp
rm -rf /tmp/stage_backend /tmp/stage_dist /tmp/backend_release.tar.gz /tmp/dist_release_app.tar.gz
echo "Deployment steps finished successfully."
"""

stdin, stdout, stderr = ssh.exec_command(deploy_cmds, get_pty=True)
for line in iter(stdout.readline, ""):
    print(line, end='', flush=True)

exit_status = stdout.channel.recv_exit_status()
print(f"Deployment script exit status: {exit_status}")

ssh.close()

if exit_status != 0:
    print("Deployment failed!")
    sys.exit(exit_status)

print("Rehosting deployment completed successfully on server.")
