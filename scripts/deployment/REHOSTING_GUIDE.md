# 🌍 Goimomi Holidays — Complete Server Rehosting & Deployment Guide

This guide provides the complete manual step-by-step instructions as well as automated 1-click scripts to rehost the entire Goimomi full-stack application on Ubuntu Linux (`goimomi.com`).

> **Current production deployment:** Read [LIVE_DEPLOYMENT.md](LIVE_DEPLOYMENT.md) for the release deployed on 9 September 2026, verified service names, backups, and rollback instructions. The bootstrap commands below assume an older layout and must be adapted before use on the current server.

---

## 📋 System Architecture

```text
                        [ Client / Browser ]
                                 │
                                 │ HTTPS (Port 443) / HTTP (Port 80)
                                 ▼
                     ┌───────────────────────┐
                     │     Nginx Server      │
                     │  (Reverse Proxy / SSL)│
                     └───┬───────────────┬───┘
                         │               │
        Static SPA /dist │               │ /api/, /management/, /payment/
                         ▼               ▼
             ┌────────────────┐  ┌───────────────────────────────┐
             │ React Frontend │  │   Gunicorn WSGI Application   │
             │   (Vite SPA)   │  │   (Django REST API - Port 8000│
             └────────────────┘  └───┬───────────────┬───────────┘
                                     │               │
                            PostgreSQL               │ Redis Broker
                                     ▼               ▼
                        ┌──────────────────┐  ┌──────────────────┐
                        │   PostgreSQL     │  │  Celery Worker & │
                        │   Database       │  │   Celery Beat    │
                        │  (goimomi_db)    │  │ (Async & Cron)   │
                        └──────────────────┘  └──────────────────┘
```

---

## 🔐 Firewall & AWS Security Group Settings

Ensure the following inbound ports are open on the AWS EC2 Security Group:
- **Port 22 (SSH)** — Your IP / Administrator IP
- **Port 80 (HTTP)** — `0.0.0.0/0` (Anywhere)
- **Port 443 (HTTPS)** — `0.0.0.0/0` (Anywhere)

---

## 🛠️ Method A: 1-Click Automated Setup (Fastest)

If you have already uploaded the repository to the server or cloned it:

```bash
# 1. SSH into the server
ssh -i /path/to/key.pem ubuntu@<your-server-ip>

# 2. Navigate to deployment scripts and execute master setup
chmod +x /home/ubuntu/goimomi/scripts/deployment/*.sh
sudo /home/ubuntu/goimomi/scripts/deployment/setup_server.sh

# 3. Deploy code & start services
/home/ubuntu/goimomi/scripts/deployment/deploy.sh
```

---

## 📖 Method B: Step-by-Step Manual Rehosting

### Step 1: Connect to the Server

```bash
ssh -i /path/to/your-key.pem ubuntu@<your-server-ip>
```

---

### Step 2: Update System & Install Core Dependencies

```bash
sudo apt-get update -y && sudo apt-get upgrade -y

# Install build tools, Python, PostgreSQL, Redis, Nginx, Certbot & PDF Rendering libraries
sudo apt-get install -y \
    curl git unzip zip build-essential software-properties-common ufw \
    python3 python3-pip python3-venv python3-dev libpq-dev \
    postgresql postgresql-contrib redis-server nginx certbot python3-certbot-nginx \
    libpango-1.0-0 libpangoft2-1.0-0 libjpeg-dev zlib1g-dev libffi-dev
```

---

### Step 3: Install Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # Should show v20.x
npm -v
```

---

### Step 4: Configure PostgreSQL Database & User

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql

sudo -u postgres psql
```

Inside the PostgreSQL shell:

```sql
CREATE DATABASE goimomi_db;
CREATE USER goimomi_user WITH PASSWORD 'your_strong_password_here';
ALTER ROLE goimomi_user SET client_encoding TO 'utf8';
ALTER ROLE goimomi_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE goimomi_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE goimomi_db TO goimomi_user;
\c goimomi_db
GRANT ALL ON SCHEMA public TO goimomi_user;
ALTER SCHEMA public OWNER TO goimomi_user;
\q
```

---

### Step 5: Configure Redis Server

```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # Should return: PONG
```

---

### Step 6: Create Directory Structure & Transfer Project Files

Create application directory:

```bash
mkdir -p /home/ubuntu/goimomi
mkdir -p /home/ubuntu/backups
sudo mkdir -p /var/log/gunicorn /var/log/celery /var/log/nginx
sudo chown -R ubuntu:www-data /var/log/gunicorn /var/log/celery
```

#### Upload from Local Machine to Server:

From your local machine (PowerShell / Terminal):

```powershell
# Upload update_package.zip
scp -i /path/to/key.pem update_package.zip ubuntu@<your-server-ip>:/home/ubuntu/
```

On the Server:

```bash
unzip -o /home/ubuntu/update_package.zip -d /home/ubuntu/goimomi
```

---

### Step 7: Configure Django Backend

```bash
cd /home/ubuntu/goimomi/goimomibackend

# 1. Create Python Virtual Environment
python3 -m venv venv
source venv/bin/activate

# 2. Install Dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 3. Create / Configure .env File
nano .env
```

Ensure `.env` contains:

```ini
DB_NAME=goimomi_db
DB_USER=goimomi_user
DB_PASSWORD=your_secure_db_password
DB_HOST=localhost
DB_PORT=5432
DEBUG=False
ALLOWED_HOSTS=goimomi.com,www.goimomi.com,localhost,127.0.0.1
SECRET_KEY=your_django_production_secret_key

# Email Settings (Brevo SMTP)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your_smtp_user@smtp-brevo.com
EMAIL_HOST_PASSWORD=your_smtp_password
DEFAULT_FROM_EMAIL=Goimomi Holidays <Reservations@goimomi.com>
COMPANY_EMAIL=Reservations@goimomi.com

# Zoho CRM Configuration
ZOHO_CRM_REFRESH_TOKEN=your_zoho_crm_refresh_token
ZOHO_CRM_CLIENT_ID=your_zoho_crm_client_id
ZOHO_CRM_CLIENT_SECRET=your_zoho_crm_client_secret
ZOHO_CRM_WEBHOOK_SECRET=your_zoho_crm_webhook_secret
FRONTEND_URL=https://goimomi.com

# Zoho Payments Configuration
ZOHO_PAYMENTS_ACCOUNT_ID=your_zoho_payments_account_id
ZOHO_PAYMENTS_EDITION=IN
ZOHO_PAYMENTS_CLIENT_ID=your_zoho_payments_client_id
ZOHO_PAYMENTS_CLIENT_SECRET=your_zoho_payments_client_secret
ZOHO_PAYMENTS_REFRESH_TOKEN=your_zoho_payments_refresh_token
ZOHO_PAYMENTS_REDIRECT_URI=https://www.goimomi.com/
ZOHO_PAYMENTS_WEBHOOK_ID=your_zoho_payments_webhook_id
ZOHO_PAYMENTS_WEBHOOK_SIGNING_KEY=your_zoho_payments_webhook_signing_key
ZOHO_PAYMENTS_SIGNING_KEY=your_zoho_payments_signing_key

# Celery Broker
CELERY_BROKER_URL=redis://127.0.0.1:6379/0
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/0
```

#### Run Database Migrations & Static Files Collection:

```bash
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# (Optional) Seed initial data & fix media references if needed:
python manage.py populate_countries || true
python manage.py populate_starting_cities || true
python manage.py seed_airports || true
python manage.py seed_sightseeing || true
python manage.py populate_visa_data || true
python manage.py fix_vehicle_images || true
python manage.py fix_package_images || true

# (Optional) Create Django Superuser for Management Dashboard:
python manage.py createsuperuser
```

---

### Step 8: Build React Frontend

```bash
cd /home/ubuntu/goimomi/goimomifrontend

npm install
npm run build
```

This compiles the production single-page bundle to `/home/ubuntu/goimomi/goimomifrontend/dist`.

---

### Step 9: Configure Systemd Services

#### 1. Gunicorn Backend Service (`/etc/systemd/system/goimomi.service`)

```bash
sudo nano /etc/systemd/system/goimomi.service
```

Content:

```ini
[Unit]
Description=Goimomi Django REST API (Gunicorn WSGI)
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/goimomi/goimomibackend
Environment="PATH=/home/ubuntu/goimomi/goimomibackend/venv/bin:/usr/local/bin:/usr/bin"
EnvironmentFile=/home/ubuntu/goimomi/goimomibackend/.env
ExecStart=/home/ubuntu/goimomi/goimomibackend/venv/bin/gunicorn \
          --workers 3 \
          --bind 127.0.0.1:8000 \
          --timeout 120 \
          --access-logfile /var/log/gunicorn/goimomi_access.log \
          --error-logfile /var/log/gunicorn/goimomi_error.log \
          backend.wsgi:application

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

#### 2. Celery Worker Service (`/etc/systemd/system/goimomi-celery.service`)

```bash
sudo nano /etc/systemd/system/goimomi-celery.service
```

Content:

```ini
[Unit]
Description=Goimomi Celery Worker Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/goimomi/goimomibackend
Environment="PATH=/home/ubuntu/goimomi/goimomibackend/venv/bin:/usr/local/bin:/usr/bin"
EnvironmentFile=/home/ubuntu/goimomi/goimomibackend/.env
ExecStart=/home/ubuntu/goimomi/goimomibackend/venv/bin/celery \
          -A backend worker \
          -l info \
          --logfile=/var/log/celery/goimomi_worker.log

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 3. Celery Beat Scheduler Service (`/etc/systemd/system/goimomi-beat.service`)

```bash
sudo nano /etc/systemd/system/goimomi-beat.service
```

Content:

```ini
[Unit]
Description=Goimomi Celery Beat Scheduler Service
After=network.target postgresql.service redis.service goimomi-celery.service

[Service]
Type=simple
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/goimomi/goimomibackend
Environment="PATH=/home/ubuntu/goimomi/goimomibackend/venv/bin:/usr/local/bin:/usr/bin"
EnvironmentFile=/home/ubuntu/goimomi/goimomibackend/.env
ExecStart=/home/ubuntu/goimomi/goimomibackend/venv/bin/celery \
          -A backend beat \
          -l info \
          --pidfile=/tmp/celerybeat-goimomi.pid \
          --logfile=/var/log/celery/goimomi_beat.log

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### Enable and Start Services:

```bash
sudo systemctl daemon-reload

sudo systemctl enable goimomi.service
sudo systemctl start goimomi.service

sudo systemctl enable goimomi-celery.service
sudo systemctl start goimomi-celery.service

sudo systemctl enable goimomi-beat.service
sudo systemctl start goimomi-beat.service
```

---

### Step 10: Configure Nginx Reverse Proxy

Create Nginx site configuration:

```bash
sudo nano /etc/nginx/sites-available/goimomi
```

Content:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name goimomi.com www.goimomi.com;

    client_max_body_size 50M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # React Frontend Single Page App
    location / {
        root /home/ubuntu/goimomi/goimomifrontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;

        location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc|woff|woff2|ttf)$ {
            expires 30d;
            add_header Cache-Control "public, max-age=2592000, immutable";
            access_log off;
        }
    }

    # Django Backend REST API
    location /api/ {
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
    }

    # Django Admin / Management Panel
    location /management/ {
        proxy_pass http://127.0.0.1:8000/management/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_read_timeout 120s;
    }

    # Payment Callback & Webhooks
    location /payment/ {
        proxy_pass http://127.0.0.1:8000/payment/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    # Django Static Files
    location /static/ {
        alias /home/ubuntu/goimomi/goimomibackend/static/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }

    # Uploaded Media Files
    location /media/ {
        alias /home/ubuntu/goimomi/goimomibackend/media/;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
        access_log off;
    }

    error_log /var/log/nginx/goimomi_error.log warn;
    access_log /var/log/nginx/goimomi_access.log;
}
```

Enable site & test Nginx:

```bash
sudo ln -sf /etc/nginx/sites-available/goimomi /etc/nginx/sites-enabled/goimomi
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 11: Setup Free SSL/TLS Certificates (Let's Encrypt)

Once your domain DNS A-records for `goimomi.com` and `www.goimomi.com` point to your server IP:

```bash
sudo certbot --nginx -d goimomi.com -d www.goimomi.com
```

Certbot will automatically obtain certificates and configure HTTPS redirects in Nginx.

---

### Step 12: Set Permissions & Final Verification

```bash
sudo chown -R ubuntu:www-data /home/ubuntu/goimomi
sudo chmod -R 755 /home/ubuntu/goimomi
sudo chmod -R 775 /home/ubuntu/goimomi/goimomibackend/media

# Check running services
sudo systemctl status goimomi
sudo systemctl status goimomi-celery
sudo systemctl status goimomi-beat
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server
```

---

## 🔍 Useful Health & Monitoring Commands

| Action | Command |
| :--- | :--- |
| **Backend Logs** | `sudo journalctl -u goimomi -f` |
| **Gunicorn Logs** | `tail -f /var/log/gunicorn/goimomi_error.log` |
| **Celery Logs** | `tail -f /var/log/celery/goimomi_worker.log` |
| **Nginx Error Logs** | `tail -f /var/log/nginx/goimomi_error.log` |
| **Restart Backend** | `sudo systemctl restart goimomi` |
| **Restart Workers** | `sudo systemctl restart goimomi-celery goimomi-beat` |
| **Reload Nginx** | `sudo systemctl reload nginx` |
| **Backup DB & Media**| `/home/ubuntu/goimomi/scripts/deployment/backup_restore.sh backup` |
| **Restore DB & Media**| `/home/ubuntu/goimomi/scripts/deployment/backup_restore.sh restore` |

