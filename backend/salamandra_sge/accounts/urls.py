from django.urls import path
from .views import LoginView, LogoutView, ProfileView, CsrfTokenView

app_name = 'accounts'

urlpatterns = [
    path('csrf-token/', CsrfTokenView.as_view(), name='csrf-token'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', ProfileView.as_view(), name='profile'),
]
