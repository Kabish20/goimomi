"""Isolated settings for checks and tests; never connect to the application database."""

from .settings import *  # noqa: F403

DATABASES = {'default': {'ENGINE': 'django.db.backends.sqlite3', 'NAME': ':memory:'}}
DEBUG = False
SECRET_KEY = 'goimomi-tests-only-not-for-deployment'
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']
SECURE_SSL_REDIRECT = False
EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'
PASSWORD_HASHERS = ['django.contrib.auth.hashers.MD5PasswordHasher']
CELERY_BROKER_URL = 'memory://'
CELERY_RESULT_BACKEND = 'cache+memory://'
GLOBAL_HORIZONS_EXPORT_CC = []

REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100000/minute',
        'user': '100000/minute',
        'email_sharing': '100000/minute',
        'admin_login': '100000/minute',
    },
}
