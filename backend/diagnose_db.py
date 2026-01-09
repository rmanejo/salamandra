import os
import django
from django.conf import settings
from pathlib import Path

# Setup Django minimal settings
BASE_DIR = Path(__file__).resolve().parent
if not settings.configured:
    settings.configure(
        DATABASES={
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        },
        INSTALLED_APPS=[
            'core',
            'salamandra_sge.accounts',
            'salamandra_sge.instituicoes',
            'salamandra_sge.academico',
        ],
        AUTH_USER_MODEL='core.CustomUser',
    )
    django.setup()

from core.models import School, CustomUser
from salamandra_sge.academico.models import Professor

print("--- SCHOOLS ---")
for s in School.objects.all():
    print(f"ID: {s.id}, Name: {s.name}")

print("\n--- USERS ---")
for u in CustomUser.objects.all():
    print(f"Email: {u.email}, Role: {u.role}, School ID: {u.school_id}")

print("\n--- PROFESSORS ---")
for p in Professor.objects.all():
    print(f"ID: {p.id}, School ID: {p.school_id}, User: {p.user.email}")
