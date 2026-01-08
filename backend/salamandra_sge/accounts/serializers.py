from rest_framework import serializers
from core.models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'role', 'role_display', 'district', 'school', 
            'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined', 'role_display']  # adiciona role_display aqui tb
        extra_kwargs = {
            'email': {'required': True},  # se email for o identificador principal
            # 'password': {'write_only': True}  # só se for usar para criação/atualização de senha em outro lugar
        }

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)