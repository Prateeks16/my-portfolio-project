#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

# Seed the outreach templates, and create the CRM admin user when
# CRM_ADMIN_USERNAME / CRM_ADMIN_PASSWORD are present in the environment.
#
# This runs here rather than from a shell because an interactive shell is a paid
# feature on Render's free tier. Everything the command does is get_or_create, so
# running it on every deploy is safe and never overwrites edits. Once the account
# exists you can clear CRM_ADMIN_PASSWORD from the environment; re-adding it later
# is also how you reset a forgotten password.
python manage.py bootstrap_crm
