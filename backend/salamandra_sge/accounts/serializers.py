from rest_framework import serializers
from core.models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_blocked = serializers.BooleanField(source='school.blocked', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    academic_roles = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'role', 'role_display', 'district', 'district_name',
            'school', 'school_name', 'school_blocked',
            'is_active', 'date_joined', 'academic_roles'
        ]
        read_only_fields = ['id', 'date_joined', 'role_display', 'school_name', 'school_blocked', 'district_name', 'academic_roles']
        extra_kwargs = {
            'email': {'required': True},
        }

    def get_academic_roles(self, obj):
        roles = {
            'is_dt': False,
            'is_cc': False,
            'is_dd': False
        }
        if obj.role == 'PROFESSOR' and hasattr(obj, 'docente_profile'):
            from salamandra_sge.academico.models import DirectorTurma, CoordenadorClasse, DelegadoDisciplina
            prof = obj.docente_profile
            roles['is_dt'] = DirectorTurma.objects.filter(professor=prof).exists()
            roles['is_cc'] = CoordenadorClasse.objects.filter(professor=prof).exists()
            roles['is_dd'] = DelegadoDisciplina.objects.filter(professor=prof).exists()
        return roles

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)