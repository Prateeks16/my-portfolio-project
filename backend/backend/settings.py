"""
Django settings for backend project.
Fixed for Windows & Render Deployment
"""

import os
import dj_database_url
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
# Try block isliye taaki Render par error na aaye agar dotenv installed na ho
try:
    from dotenv import load_dotenv
    # Explicitly path bataya hai taaki confusion na ho
    env_path = BASE_DIR / '.env'
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-fallback-key')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '*').split(',')

# Hosts allowed to talk to this API. The custom domain, the Vercel
# deployment, and local dev. Extra origins can be appended at runtime with
# EXTRA_ALLOWED_ORIGINS as a comma-separated list.
SITE_ORIGINS = [
    "https://prateeks16.in",
    "https://www.prateeks16.in",
    "https://prateeksahu.vercel.app",
    "https://my-portfolio-project-ochre-six.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

_extra = os.environ.get('EXTRA_ALLOWED_ORIGINS', '')
SITE_ORIGINS += [origin.strip() for origin in _extra.split(',') if origin.strip()]

CSRF_TRUSTED_ORIGINS = SITE_ORIGINS + [
    "https://my-portfolio-backend-awei.onrender.com",
]

CORS_ALLOWED_ORIGINS = SITE_ORIGINS

# Vercel gives every preview deployment its own subdomain, so allow those too.
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.vercel\.app$",
]

# The API serves public, non-credentialed reads and bearer-token writes, so
# cookies are never needed cross-origin. Keeping this False is what allows the
# analytics beacon to post without tripping the credentialed-CORS rules.
CORS_ALLOW_CREDENTIALS = False


# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    
    'whitenoise.runserver_nostatic', 
    'django.contrib.staticfiles',

    # Third-party
    'cloudinary_storage',
    'rest_framework',
    'corsheaders',
    'cloudinary',
    
    # Local apps
    'api',
    'crm',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', 
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': ['templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# --- DATABASE SETTINGS (FIXED) ---

# 1. Default: Local SQLite (Ye Windows par bina error ke chalega)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# 2. Override: Agar DATABASE_URL milta hai (.env ya Render se), toh Postgres use karo
database_url = os.environ.get("DATABASE_URL")

if database_url:
    DATABASES['default'] = dj_database_url.parse(
        database_url,
        conn_max_age=600,
        conn_health_checks=True,
    )


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    { 'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]


# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# --- CLOUDINARY SETTINGS ---
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': os.environ.get('CLOUD_NAME'),
    'API_KEY': os.environ.get('CLOUD_API_KEY'),
    'API_SECRET': os.environ.get('CLOUD_API_SECRET')
}

STORAGES = {
    "default": {
        "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# --- REST FRAMEWORK / JWT AUTH ---
# Public portfolio endpoints stay open (they set AllowAny explicitly).
# Everything under /api/crm/ requires a bearer token.
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.AllowAny',
    ),
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=12),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=14),
    'ROTATE_REFRESH_TOKENS': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}


# --- OUTBOUND EMAIL ---
# Sending is opt-in. With no credentials set, the CRM still drafts and stores
# emails but the send endpoint refuses with a clear message instead of failing
# silently. For Gmail, EMAIL_HOST_PASSWORD must be an App Password, not the
# account password.
EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend'
)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)


# --- CRM ---
# Single-purpose token for the scheduled job scan. Unset means ingest is closed.
CRM_INGEST_TOKEN = os.environ.get('CRM_INGEST_TOKEN', '')

GITHUB_USERNAME = os.environ.get('GITHUB_USERNAME', 'Prateeks16')
PORTFOLIO_URL = os.environ.get('PORTFOLIO_URL', 'https://prateeks16.in')
