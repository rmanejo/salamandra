from rest_framework import status, views, permissions, generics
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
from rest_framework.authentication import SessionAuthentication
from .serializers import UserSerializer, LoginSerializer, ChangePasswordSerializer, UserCreateSerializer
from core.models import CustomUser
from salamandra_sge.accounts.permissions import IsAdminSistema

class CsrfTokenView(views.APIView):
    permission_classes = [permissions.AllowAny]
    
    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        token = get_token(request)
        return Response({'csrfToken': token})

class LoginView(views.APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []  # No authentication required for login
    
    @method_decorator(csrf_protect)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                email=serializer.validated_data['email'],
                password=serializer.validated_data['password']
            )
            if user:
                login(request, user)
                # Get CSRF token after login for subsequent requests
                csrf_token = get_token(request)
                response_data = UserSerializer(user).data
                response = Response(response_data)
                # Set CSRF cookie in response for future requests
                response.set_cookie('csrftoken', csrf_token, httponly=False, samesite='Lax', max_age=86400)
                return response
            return Response(
                {"detail": "Credenciais inválidas"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(views.APIView):
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

class ProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class VerifyPasswordView(views.APIView):
    """
    Verifica se a senha fornecida corresponde à do usuário autenticado.
    Usada para autenticação secundária em ações sensíveis.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')
        if not password:
            return Response({"error": "Senha não fornecida"}, status=status.HTTP_400_BAD_REQUEST)
        
        user = authenticate(email=request.user.email, password=password)
        if user:
            return Response({"status": "success", "message": "Senha verificada"}, status=status.HTTP_200_OK)
        
        return Response({"error": "Senha incorrecta"}, status=status.HTTP_403_FORBIDDEN)

class ChangePasswordView(views.APIView):
    """
    Permite que o utilizador autenticado altere a própria senha.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        old_password = serializer.validated_data['old_password']
        new_password = serializer.validated_data['new_password']

        if not user.check_password(old_password):
            return Response({"old_password": "Senha actual incorrecta."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save()
        return Response({"status": "success", "message": "Senha alterada com sucesso."})

class UsersView(generics.ListCreateAPIView):
    """
    Gestão básica de utilizadores (Admin Sistema).
    """
    queryset = CustomUser.objects.all().order_by('id')

    def get_permissions(self):
        return [permissions.IsAuthenticated(), IsAdminSistema()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
