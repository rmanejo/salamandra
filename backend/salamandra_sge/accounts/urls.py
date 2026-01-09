from django.urls import path
from .views import LoginView, LogoutView, ProfileView, CsrfTokenView, VerifyPasswordView

app_name = 'accounts'

urlpatterns = [
    path('csrf-token/', CsrfTokenView.as_view(), name='csrf-token'),
    path('verify-password/', VerifyPasswordView.as_view(), name='verify-password'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', ProfileView.as_view(), name='profile'),
]
