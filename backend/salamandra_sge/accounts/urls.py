from django.urls import path
from .views import (
    LoginView, LogoutView, ProfileView, CsrfTokenView,
    VerifyPasswordView, ChangePasswordView, UsersView
)

app_name = 'accounts'

urlpatterns = [
    path('csrf-token/', CsrfTokenView.as_view(), name='csrf-token'),
    path('verify-password/', VerifyPasswordView.as_view(), name='verify-password'),
    path('change_password/', ChangePasswordView.as_view(), name='change-password'),
    path('users/', UsersView.as_view(), name='users'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', ProfileView.as_view(), name='profile'),
]
