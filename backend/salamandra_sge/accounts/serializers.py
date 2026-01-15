from rest_framework import serializers
from core.models import CustomUser

class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_blocked = serializers.BooleanField(source='school.blocked', read_only=True)
    school_current_ano_letivo = serializers.IntegerField(source='school.current_ano_letivo', read_only=True)
    school_current_trimestre = serializers.IntegerField(source='school.current_trimestre', read_only=True)
    district_name = serializers.CharField(source='district.name', read_only=True)
    academic_roles = serializers.SerializerMethodField()
    can_lancar_notas = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'role', 'role_display', 'district', 'district_name',
            'school', 'school_name', 'school_blocked',
            'school_current_ano_letivo', 'school_current_trimestre',
            'is_active', 'date_joined', 'academic_roles', 'can_lancar_notas'
        ]
        read_only_fields = [
            'id', 'date_joined', 'role_display',
            'school_name', 'school_blocked',
            'school_current_ano_letivo', 'school_current_trimestre',
            'district_name', 'academic_roles', 'can_lancar_notas'
        ]
        extra_kwargs = {
            'email': {'required': True},
        }

    def get_academic_roles(self, obj):
        roles = {
            'is_dt': False,
            'is_cc': False,
            'is_dd': False
        }
        if hasattr(obj, 'docente_profile'):
            from salamandra_sge.academico.models import DirectorTurma, CoordenadorClasse, DelegadoDisciplina
            prof = obj.docente_profile
            roles['is_dt'] = DirectorTurma.objects.filter(professor=prof).exists()
            roles['is_cc'] = CoordenadorClasse.objects.filter(professor=prof).exists()
            roles['is_dd'] = DelegadoDisciplina.objects.filter(professor=prof).exists()
        return roles

    def get_can_lancar_notas(self, obj):
        if not hasattr(obj, 'docente_profile'):
            return False
        from salamandra_sge.academico.models import ProfessorTurmaDisciplina
        return ProfessorTurmaDisciplina.objects.filter(professor=obj.docente_profile).exists()

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs.get('new_password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "As senhas não coincidem."})
        return attrs

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'role', 'district', 'school', 'is_active', 'password'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password')
        return CustomUser.objects.create_user(password=password, **validated_data)
