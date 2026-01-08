from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DistrictViewSet

router = DefaultRouter()
router.register(r'districts', DistrictViewSet, basename='district')

app_name = 'core'

urlpatterns = [
    path('', include(router.urls)),
]

