from django.db import models
from decimal import Decimal
from rest_framework import viewsets, status, permissions
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from salamandra_sge.accounts.permissions import IsProfessor, IsDT, IsSchoolNotBlocked
from .models import Nota, Falta, ResumoTrimestral
from .serializers import NotaSerializer, FaltaSerializer, ResumoTrimestralSerializer, NotaUpsertSerializer
from salamandra_sge.academico.models import ProfessorTurmaDisciplina, DirectorTurma, Turma, Disciplina, Aluno
from .services import AvaliacaoService
from salamandra_sge.avaliacoes.services.caderneta import (
    recalcular_resumo_trimestral,
    arredondar_media,
    arredondar_decimal,
)

class NotaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para professores lançarem e editarem notas.
    """
    queryset = Nota.objects.all()
    serializer_class = NotaSerializer
    permission_classes = [IsAuthenticated, IsProfessor, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(school=user.school)
        
        # Usuários administrativos/DAP vêm todas as notas da escola
        if user.role in ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO']:
            return qs
            
        # Professores só veem notas das suas turmas/disciplinas atribuídas
        atribuicoes = ProfessorTurmaDisciplina.objects.filter(professor__user=user)
        turmas_ids = list(atribuicoes.values_list('turma_id', flat=True))
        disciplinas_ids = list(atribuicoes.values_list('disciplina_id', flat=True))
        
        # Adicionar disciplinas onde o professor é Delegado de Disciplina
        from salamandra_sge.academico.models import DelegadoDisciplina
        delegacoes = DelegadoDisciplina.objects.filter(professor__user=user)
        delegated_disciplinas_ids = list(delegacoes.values_list('disciplina_id', flat=True))
        
        if delegated_disciplinas_ids:
            # Se for DD, ele pode ver qualquer turma dessa disciplina na escola
            return qs.filter(
                models.Q(turma_id__in=turmas_ids, disciplina_id__in=disciplinas_ids) |
                models.Q(disciplina_id__in=delegated_disciplinas_ids)
            )
        
        return qs.filter(turma_id__in=turmas_ids, disciplina_id__in=disciplinas_ids)

    def perform_create(self, serializer):
        self._enforce_professor_assignment(serializer.validated_data)
        instance = serializer.save(school=self.request.user.school)
        self._update_resumo(instance)

    def perform_update(self, serializer):
        self._enforce_professor_assignment(serializer.validated_data, instance=serializer.instance)
        instance = serializer.save()
        self._update_resumo(instance)

    def _enforce_professor_assignment(self, validated_data, instance=None):
        user = self.request.user
        if user.role in ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO']:
            return
        if not hasattr(user, 'docente_profile'):
            raise permissions.PermissionDenied("Perfil docente inválido.")

        turma = validated_data.get('turma') or (instance.turma if instance else None)
        disciplina = validated_data.get('disciplina') or (instance.disciplina if instance else None)
        if not turma or not disciplina:
            raise permissions.PermissionDenied("Turma e disciplina são obrigatórias.")

        if not ProfessorTurmaDisciplina.objects.filter(
            professor__user=user,
            turma=turma,
            disciplina=disciplina
        ).exists():
            raise permissions.PermissionDenied("Sem atribuição para lançar notas nesta turma/disciplina.")

    def _update_resumo(self, instance):
        # Update summary using service
        # Use student's current turma if possible, else the note's turma
        turma_atual = instance.aluno.turma_atual or instance.turma
        
        AvaliacaoService.update_resumo_trimestral(
            student=instance.aluno,
            discipline=instance.disciplina,
            trimester=instance.trimestre,
            year=instance.turma.ano_letivo,
            turma_context=turma_atual
        )

class ResumoTrimestralViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para visualizar os resumos trimestrais (Caderneta).
    """
    queryset = ResumoTrimestral.objects.all()
    serializer_class = ResumoTrimestralSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(school=user.school)
        
        # Filtros opcionais
        turma_id = self.request.query_params.get('turma')
        disciplina_id = self.request.query_params.get('disciplina')
        aluno_id = self.request.query_params.get('aluno')
        trimestre = self.request.query_params.get('trimestre')

        if turma_id and turma_id.isdigit():
            qs = qs.filter(turma_id=turma_id)
        if disciplina_id and disciplina_id.isdigit():
            qs = qs.filter(disciplina_id=disciplina_id)
        if aluno_id and aluno_id.isdigit():
            qs = qs.filter(aluno_id=aluno_id)
        if trimestre and trimestre.isdigit():
            qs = qs.filter(trimestre=trimestre)
            
        return qs

class FaltaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de faltas (Adição de faltas pelo DT ou Professor).
    """
    queryset = Falta.objects.all()
    serializer_class = FaltaSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(school=user.school)

        turma_id = self.request.query_params.get('turma_id') or self.request.query_params.get('turma')
        disciplina_id = self.request.query_params.get('disciplina_id') or self.request.query_params.get('disciplina')
        aluno_id = self.request.query_params.get('aluno_id') or self.request.query_params.get('aluno')
        trimestre = self.request.query_params.get('trimestre')

        if turma_id and turma_id.isdigit():
            qs = qs.filter(turma_id=turma_id)
        if disciplina_id and disciplina_id.isdigit():
            qs = qs.filter(disciplina_id=disciplina_id)
        if aluno_id and aluno_id.isdigit():
            qs = qs.filter(aluno_id=aluno_id)
        if trimestre and trimestre.isdigit():
            qs = qs.filter(trimestre=trimestre)

        if user.role == 'PROFESSOR':
            # Se for DT, vê faltas da sua turma
            try:
                dt = DirectorTurma.objects.get(professor__user=user)
                return qs.filter(turma=dt.turma)
            except DirectorTurma.DoesNotExist:
                # Se não for DT, talvez veja apenas faltas da sua disciplina
                atribuicoes = ProfessorTurmaDisciplina.objects.filter(professor__user=user)
                turmas_ids = atribuicoes.values_list('turma_id', flat=True)
                return qs.filter(turma_id__in=turmas_ids)
                
        return qs

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)


class NotaUpsertView(APIView):
    """
    Endpoint para lançar/atualizar uma nota específica (célula da caderneta).
    """
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def put(self, request):
        serializer = NotaUpsertSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if user.role not in ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO'] and not hasattr(user, 'docente_profile'):
            return Response({"error": "Perfil docente inválido."}, status=status.HTTP_403_FORBIDDEN)

        turma = Turma.objects.filter(id=serializer.validated_data['turma_id'], school=user.school).first()
        disciplina = Disciplina.objects.filter(
            id=serializer.validated_data['disciplina_id'],
            school=user.school
        ).first()
        aluno = Aluno.objects.filter(id=serializer.validated_data['aluno_id'], school=user.school).first()

        if not turma or not disciplina or not aluno:
            return Response({"error": "Dados inválidos para escola."}, status=status.HTTP_400_BAD_REQUEST)

        if user.role not in ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO']:
            if not ProfessorTurmaDisciplina.objects.filter(
                professor__user=user,
                turma=turma,
                disciplina=disciplina
            ).exists():
                return Response(
                    {"error": "Sem atribuição para lançar notas nesta turma/disciplina."},
                    status=status.HTTP_403_FORBIDDEN
                )

        ano_letivo = turma.ano_letivo
        trimestre = serializer.validated_data['trimestre']
        tipo = serializer.validated_data['tipo']
        valor = serializer.validated_data.get('valor')

        nota, _ = Nota.objects.update_or_create(
            school=user.school,
            aluno=aluno,
            turma=turma,
            disciplina=disciplina,
            ano_letivo=ano_letivo,
            trimestre=trimestre,
            tipo=tipo,
            defaults={
                "valor": valor
            }
        )

        resumo = recalcular_resumo_trimestral(
            school=user.school,
            aluno=aluno,
            turma=turma,
            disciplina=disciplina,
            ano_letivo=ano_letivo,
            trimestre=trimestre,
        )

        mts = ResumoTrimestral.objects.filter(
            school=user.school,
            aluno=aluno,
            disciplina=disciplina,
            ano_letivo=ano_letivo,
        ).values_list("mt", flat=True)
        mts_vals = [mt for mt in mts if mt is not None]
        mfd = None
        if mts_vals:
            mfd = float(arredondar_decimal(Decimal(sum(mts_vals)) / Decimal(len(mts_vals))))

        return Response({
            "nota": {
                "id": nota.id,
                "valor": float(nota.valor) if nota.valor is not None else None,
                "tipo": nota.tipo,
                "trimestre": nota.trimestre,
                "ano_letivo": nota.ano_letivo,
            },
            "resumo": {
                "macs": float(resumo.macs) if resumo.macs is not None else None,
                "mt": int(resumo.mt) if resumo.mt is not None else None,
                "com": resumo.com,
                "mfd": mfd,
            }
        }, status=status.HTTP_200_OK)


class CadernetaView(APIView):
    """
    Retorna a caderneta da turma/disciplinas com notas e resumos.
    """
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get(self, request):
        turma_id = request.query_params.get('turma_id')
        disciplina_id = request.query_params.get('disciplina_id')
        ano_letivo = request.query_params.get('ano_letivo')

        if not all([turma_id, disciplina_id, ano_letivo]):
            return Response(
                {"error": "turma_id, disciplina_id e ano_letivo são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not str(ano_letivo).isdigit():
            return Response({"error": "ano_letivo inválido."}, status=status.HTTP_400_BAD_REQUEST)

        turma = Turma.objects.filter(id=turma_id, school=request.user.school).first()
        disciplina = Disciplina.objects.filter(id=disciplina_id, school=request.user.school).first()
        if not turma or not disciplina:
            return Response({"error": "Turma ou disciplina não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        alunos = list(Aluno.objects.filter(turma_atual=turma))
        alunos.sort(key=lambda a: (a.numero_turma is None, a.numero_turma or 0, a.nome_completo))

        notas = Nota.objects.filter(
            turma=turma,
            disciplina=disciplina,
            ano_letivo=int(ano_letivo),
            aluno__in=alunos
        )
        resumos = ResumoTrimestral.objects.filter(
            turma=turma,
            disciplina=disciplina,
            ano_letivo=int(ano_letivo),
            aluno__in=alunos
        )

        notas_map = {(n.aluno_id, n.trimestre, n.tipo): n.valor for n in notas}
        resumo_map = {(r.aluno_id, r.trimestre): r for r in resumos}

        rows = []
        for aluno in alunos:
            notas_payload = {}
            resumo_payload = {}
            mts = []
            for tri in [1, 2, 3]:
                notas_payload[str(tri)] = {
                    "ACS1": float(notas_map.get((aluno.id, tri, "ACS1"))) if notas_map.get((aluno.id, tri, "ACS1")) is not None else None,
                    "ACS2": float(notas_map.get((aluno.id, tri, "ACS2"))) if notas_map.get((aluno.id, tri, "ACS2")) is not None else None,
                    "ACS3": float(notas_map.get((aluno.id, tri, "ACS3"))) if notas_map.get((aluno.id, tri, "ACS3")) is not None else None,
                    "MAP": float(notas_map.get((aluno.id, tri, "MAP"))) if notas_map.get((aluno.id, tri, "MAP")) is not None else None,
                    "ACP": float(notas_map.get((aluno.id, tri, "ACP"))) if notas_map.get((aluno.id, tri, "ACP")) is not None else None,
                }

                resumo = resumo_map.get((aluno.id, tri))
                resumo_payload[str(tri)] = {
                    "macs": float(resumo.macs) if resumo and resumo.macs is not None else None,
                    "mt": int(resumo.mt) if resumo and resumo.mt is not None else None,
                    "com": resumo.com if resumo else None,
                }
                if resumo and resumo.mt is not None:
                    mts.append(int(resumo.mt))

            mfd = None
            if mts:
                mfd = float(arredondar_decimal(Decimal(sum(mts)) / Decimal(len(mts))))

            rows.append({
                "aluno_id": aluno.id,
                "numero_turma": aluno.numero_turma,
                "nome_completo": aluno.nome_completo,
                "sexo": aluno.sexo,
                "status": aluno.status,
                "notas": notas_payload,
                "resumo": resumo_payload,
                "mfd": mfd,
            })

        return Response({
            "turma": {"id": turma.id, "nome": turma.nome, "classe": turma.classe.nome},
            "disciplina": {"id": disciplina.id, "nome": disciplina.nome},
            "ano_letivo": int(ano_letivo),
            "rows": rows
        }, status=status.HTTP_200_OK)
