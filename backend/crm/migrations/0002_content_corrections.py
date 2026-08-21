"""One-off content corrections.

These live in a migration rather than in build.sh on purpose: a migration runs
exactly once and is recorded, so it cannot quietly undo an edit made later in
the CRM. A command in build.sh would re-apply itself on every deploy.
"""

import datetime
import os

from django.db import migrations

# Overridable so the address can be changed without another migration.
CONTACT_EMAIL = os.environ.get('CONTACT_EMAIL', 'prateeks16.outreach@gmail.com')

# Both Forage simulations are short courses finished inside the month they
# began. A null end_date meant the public site rendered them as ongoing.
FORAGE_END_DATES = {
    'BCG (Boston Consulting Group)': datetime.date(2025, 8, 31),
    'Commonwealth Bank': datetime.date(2025, 4, 30),
}


def apply_corrections(apps, schema_editor):
    Profile = apps.get_model('api', 'Profile')
    Experience = apps.get_model('api', 'Experience')

    updated = Profile.objects.exclude(email=CONTACT_EMAIL).update(email=CONTACT_EMAIL)
    print(f'  profile email -> {CONTACT_EMAIL} ({updated} row(s))')

    for company, end_date in FORAGE_END_DATES.items():
        count = Experience.objects.filter(
            company_name=company, end_date__isnull=True
        ).update(end_date=end_date)
        if count:
            print(f'  {company} end_date -> {end_date}')


def reverse_corrections(apps, schema_editor):
    """Deliberately a no-op.

    The previous email is not recorded anywhere, and re-nulling the end dates
    would restore the bug. Reversing this migration leaves the data as-is.
    """


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0001_initial'),
        ('api', '0003_alter_experience_options_alter_project_image'),
    ]

    operations = [
        migrations.RunPython(apply_corrections, reverse_corrections),
    ]
