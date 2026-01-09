from rest_framework import serializers
from core.models import School, CustomUser, District
from .models import DetalheEscola
from django.db import transaction
from salamandra_sge.academico.models import Professor
from salamandra_sge.administrativo.models import Funcionario

class SchoolCreateWithUsersSerializer(serializers.ModelSerializer):
    """
    Serializer para criar uma escola juntamente com os seus 3 utilizadores obrigatórios.
    Inclui validação de email e atomicidade na base de dados.
    """
    admin_escola_email = serializers.EmailField(write_only=True)
    admin_escola_password = serializers.CharField(write_only=True)
    
    dap_email = serializers.EmailField(write_only=True)
    dap_password = serializers.CharField(write_only=True)
    
    adm_sector_email = serializers.EmailField(write_only=True)
    adm_sector_password = serializers.CharField(write_only=True)
    
    admin_is_teacher = serializers.BooleanField(write_only=True, default=False)

    class Meta:
        model = School
        fields = [
            'id', 'name', 'district', 'school_type', 'blocked',
            'admin_escola_email', 'admin_escola_password',
            'dap_email', 'dap_password',
            'adm_sector_email', 'adm_sector_password',
            'admin_is_teacher'
        ]

    def validate(self, attrs):
        emails = [
            attrs.get('admin_escola_email'),
            attrs.get('dap_email'),
            attrs.get('adm_sector_email')
        ]
        for email in emails:
            if CustomUser.objects.filter(email=email).exists():
                raise serializers.ValidationError(f"Email {email} já existe")
        return attrs

    def create(self, validated_data):
        admin_is_teacher = validated_data.pop('admin_is_teacher', False)
        users_data = {
            'ADMIN_ESCOLA': {
                'email': validated_data.pop('admin_escola_email'),
                'password': validated_data.pop('admin_escola_password'),
            },
            'DAP': {
                'email': validated_data.pop('dap_email'),
                'password': validated_data.pop('dap_password'),
            },
            'ADMINISTRATIVO': {
                'email': validated_data.pop('adm_sector_email'),
                'password': validated_data.pop('adm_sector_password'),
            }
        }

        with transaction.atomic():
            school = School.objects.create(**validated_data)

            for role, data in users_data.items():
                user = CustomUser.objects.create_user(
                    email=data['email'],
                    password=data['password'],
                    role=role,
                    school=school,
                    district=school.district,
                    first_name=role.capitalize(),
                    last_name="Automático"
                )

                # Todos os utilizadores da escola são Funcionários (GRH)
                Funcionario.objects.create(
                    user=user,
                    school=school,
                    tipo_provimento='DEFINITIVO',
                    cargo=role.replace('_', ' ').capitalize() if role != 'ADMINISTRATIVO' else 'Chefe da Secretaria',
                    sector='DIRECAO' if role in ['ADMIN_ESCOLA', 'DAP'] else 'SECRETARIA'
                )

                # DAP e AdminDocente são também Professores
                if role == 'DAP' or (role == 'ADMIN_ESCOLA' and admin_is_teacher):
                    Professor.objects.create(
                        user=user,
                        school=school,
                        tipo_provimento='DEFINITIVO',
                        formacao='N1'
                    )
            return school


class DistrictNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ['id', 'name']

class SchoolSerializer(serializers.ModelSerializer):
    district = DistrictNestedSerializer(read_only=True)
    
    class Meta:
        model = School
        fields = ['id', 'name', 'district', 'school_type', 'blocked']
        
    def to_internal_value(self, data):
        # Handle both district (object), district (integer), and district_id in input
        if 'district_id' in data:
            # If district_id is provided, use it
            data['district'] = data.pop('district_id')
        elif 'district' in data:
            if isinstance(data['district'], dict):
                # If district is an object, extract the ID
                data['district'] = data['district'].get('id')
            elif isinstance(data['district'], (int, str)):
                # If district is already an ID, keep it
                data['district'] = int(data['district'])
        return super().to_internal_value(data)

class DetalheEscolaSerializer(serializers.ModelSerializer):
    class Meta:
        model = DetalheEscola
        fields = '__all__'
