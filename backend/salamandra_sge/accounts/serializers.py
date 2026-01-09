from rest_framework import serializers
from core.models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_blocked = serializers.BooleanField(source='school.blocked', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'role', 'role_display', 'district', 'district_name',
            'school', 'school_name', 'school_blocked',
            'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined', 'role_display', 'school_name', 'school_blocked', 'district_name']
        extra_kwargs = {
            'email': {'required': True},
        }

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)