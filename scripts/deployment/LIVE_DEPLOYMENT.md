# Live Goimomi deployment

Deployed on 9 September 2026 to production server.

- Website: https://goimomi.com/ and https://www.goimomi.com/
- Active release: `/home/ubuntu/goimomi-releases/20260909T105037Z`
- Frontend: `goimomifrontend/dist` inside the active release.
- Backend: `goimomibackend` inside the active release.
- Services: `goimomi`, `celery`, `celerybeat`, `nginx`, `postgresql`, `redis-server`.
- Nginx site: `/etc/nginx/sites-available/goimomi`.
- Gunicorn socket: `/home/ubuntu/goimomi/goimomi.sock`.
- Production `.env` was copied into the release with mode 600.
- Media and Python virtual environment are symlinks to the existing directories in `/home/ubuntu/goimomi/goimomi-holidays-backend`. Keep that directory: the new release depends on it.

The database and uploaded files were preserved in place. No database restore, data seeding, or schema migration was necessary. Existing HTTPS certificates and integration credentials were retained. Nginx now proxies `/payment/callback` (with an optional trailing slash) and the dynamic holiday/visa social preview routes to Django. Frontend payment checkout routes remain served by React.

## Verification

- Production frontend build, seven frontend tests, and the packaging test passed locally.
- All 24 backend tests passed locally and again on the server using an isolated test database.
- All 1,549 release files matched the local SHA-256 manifest before activation. Previous hashed frontend assets were additionally retained for already-open browser sessions.
- Django system checks and dependency metadata checks passed; no pending migrations.
- Nginx configuration passed validation before and after activation.
- Both domain names returned HTTP 200 for 14 selected pages/API endpoints each, including the homepage, visa, holidays, cabs, admin login, checkout, Django admin, static CSS, sitemap, and dynamic social previews.
- Homepage HTML matched the local build; its JavaScript and CSS entry assets loaded successfully.
- All six services were active, and the Celery worker answered its ping.
- All six services were enabled for reboot; no recent error-priority application service journal entries were found during the final check.
- Checked user, package, visa, enquiry, booking, order, city, and airport record counts matched their pre-deployment values. All 482 uploaded files remained in the shared media directory, and a sample media URL returned HTTP 200.

Live payments, outbound email delivery, and authenticated booking workflows were not exercised. The existing Python environment emits a Requests dependency-version warning, although its dependency metadata check and application checks pass. No dependency upgrades were made during this deployment.

## Backup and rollback

Pre-deployment backups are in `/home/ubuntu/backups/rehost-20260909T105037Z`, accessible only to the deployment user/root:

- `database.dump`: full PostgreSQL custom-format dump; archive contents successfully listed.
- `application.tar.gz`: previous application, frontend build, environment files, and uploaded media; excludes virtual environments and node_modules. Gzip integrity verified.
- `server-config.tar.gz`: Nginx, the three application service units, and TLS configuration/certificates. Gzip integrity verified.

The old application remains at `/home/ubuntu/goimomi`. Immediate prior Nginx and service files are also in `/home/ubuntu/goimomi-rehost/previous`.

To roll back this release's code/configuration on the server, restore those service files and the Nginx site, then reload/restart:

```bash
set -euo pipefail
previous=/home/ubuntu/goimomi-rehost/previous
sudo cp "$previous/nginx-goimomi.conf" /etc/nginx/sites-available/goimomi
for service in goimomi celery celerybeat; do
    sudo cp "$previous/$service.service" "/etc/systemd/system/$service.service"
done
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl restart goimomi celery celerybeat
sudo systemctl reload nginx
sudo systemctl is-active goimomi celery celerybeat nginx
```

This rollback preserves current database records and uploads. Restoring the database dump would overwrite subsequent activity and is not part of the code rollback.

## Future deployments

The older `setup_server.sh`, `deploy.sh`, and `update_server.sh` assume a different service/layout configuration. Do not run them unchanged against this release: they can overwrite HTTPS configuration or update the inactive source tree. Inspect the active systemd working directories and Nginx root, prepare a new release, preserve shared media/configuration, and validate before switching.

The existing nightly backup cron job was retained. Its legacy backend path remains available along with the shared database and media.
