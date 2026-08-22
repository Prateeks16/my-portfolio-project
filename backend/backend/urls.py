"""Root URL configuration.

Two API surfaces: `api/` is the public portfolio content, `api/crm/` is
everything behind the login.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api/crm/', include('crm.urls')),
]

# In production media is served by the storage backend, not Django.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
