from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from salamandra_sge.accounts.permissions import (
    IsAdminEscola, IsDAP, IsAdministrativo, IsDAE, IsSchoolNotBlocked, 
    IsDT, IsCC, IsDD, IsProfessor
)
from .models import Aluno, Turma, Classe, Disciplina, Professor, DirectorTurma, CoordenadorClasse, DelegadoDisciplina
from .services import FormacaoTurmaService, DAEService
from .academic_role_service import AcademicRoleService
from .serializers import (
    DisciplinaSerializer, 
    ProfessorCargoAssignmentSerializer,
    AlunoSerializer,
    ProfessorSerializer,
    TransferenciaAlunoSerializer,
    MovimentacaoTurmaSerializer,
    TurmaSerializer,
    ClasseSerializer
)


class AlunoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de alunos.
    Professores têm acesso somente de leitura aos alunos das turmas onde lecionam.
    """
    queryset = Aluno.objects.all()
    serializer_class = AlunoSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get_permissions(self):
        """
        Professores só podem listar/visualizar.
        Criar/editar/deletar requer permissões administrativas.
        """
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated(), IsSchoolNotBlocked()]
        return [IsAuthenticated(), IsSchoolNotBlocked(), (IsAdminEscola | IsDAP | IsAdministrativo)()]

    def get_queryset(self):
        user = self.request.user
        qs = self.queryset.filter(school=user.school)
        
        classe_id = self.request.query_params.get('classe_id')
        turma_id = self.request.query_params.get('turma_id')
        
        # Se for professor E NÃO for administrativo/DAP/Director, filtrar apenas alunos das turmas onde leciona
        is_admin_or_manager = user.role in ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO']
        
        if hasattr(user, 'docente_profile') and not is_admin_or_manager:
            from .models import ProfessorTurmaDisciplina, DelegadoDisciplina
            professor = user.docente_profile
            
            # Turmas onde o professor leciona
            turmas_atribuidas = list(ProfessorTurmaDisciplina.objects.filter(
                professor=professor
            ).values_list('turma_id', flat=True))
            
            # Turmas de disciplinas onde o professor é Delegado de Disciplina
            delegacoes = DelegadoDisciplina.objects.filter(professor=professor)
            delegated_disciplinas_ids = list(delegacoes.values_list('disciplina_id', flat=True))
            
            # Turmas que pertencem às disciplinas delegadas
            turmas_delegadas = list(ProfessorTurmaDisciplina.objects.filter(
                disciplina_id__in=delegated_disciplinas_ids,
                school=user.school
            ).values_list('turma_id', flat=True))

            # Acesso total: Atribuídas + Delegadas
            acesso_totais = list(set(turmas_atribuidas + turmas_delegadas))
            
            # Se especificou turma_id, verificar se professor tem acesso
            if turma_id:
                if int(turma_id) not in acesso_totais:
                    return qs.none()  # Professor não tem acesso a essa turma
                qs = qs.filter(turma_atual_id=turma_id)
            else:
                # Sem filtro específico, mostrar apenas alunos das turmas com acesso
                qs = qs.filter(turma_atual_id__in=acesso_totais)
        else:
            # Usuários administrativos veem todos os alunos (com filtros opcionais)
            if classe_id:
                qs = qs.filter(classe_atual_id=classe_id)
            if turma_id:
                qs = qs.filter(turma_atual_id=turma_id)
            
        return qs

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)

    @action(detail=True, methods=['post'], permission_classes=[IsAdministrativo])
    def transferir(self, request, pk=None):
        aluno = self.get_object()
        serializer = TransferenciaAlunoSerializer(data=request.data)
        if serializer.is_valid():
            aluno.ativo = False
            # Aqui poderíamos criar um log de transferência em auditoria
            aluno.save()
            return Response({"status": "success", "message": f"Aluno {aluno.nome_completo} transferido."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsAdministrativo])
    def mover_turma(self, request, pk=None):
        aluno = self.get_object()
        serializer = MovimentacaoTurmaSerializer(data=request.data)
        if serializer.is_valid():
            try:
                nova_turma = Turma.objects.get(id=serializer.validated_data['nova_turma_id'], school=request.user.school)
                aluno.turma_atual = nova_turma
                aluno.save()
                return Response({"status": "success", "message": f"Aluno {aluno.nome_completo} movido para turma {nova_turma.nome}."}, status=status.HTTP_200_OK)
            except Turma.DoesNotExist:
                return Response({"error": "Turma destino não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def situacao_academica(self, request, pk=None):
        aluno = self.get_object()
        from salamandra_sge.avaliacoes.models import Nota
        from salamandra_sge.avaliacoes.services import AvaliacaoService
        
        # Get all disciplines for the student's current school
        disciplinas = Disciplina.objects.filter(school=request.user.school)
        
        report = []
        for disc in disciplinas:
            disc_data = {
                "disciplina_id": disc.id,
                "disciplina_nome": disc.nome,
                "trimesters": {}
            }
            
            for tri in [1, 2, 3]:
                notas = Nota.objects.filter(aluno=aluno, disciplina=disc, trimestre=tri)
                acs_list = notas.filter(tipo__in=['ACS1', 'ACS2', 'ACS3']).order_by('tipo')
                map_nota = notas.filter(tipo='MAP').first()
                acp_nota = notas.filter(tipo='ACP').first()
                
                macs = AvaliacaoService.calculate_macs(acs_list, map_nota)
                mt = None
                com = None
                
                if acp_nota and acp_nota.valor is not None:
                    mt = AvaliacaoService.calculate_mt(macs, acp_nota.valor)
                    com = AvaliacaoService.get_comportamento(mt)
                
                disc_data["trimesters"][tri] = {
                    "acs": [float(n.valor) for n in acs_list if n.valor is not None],
                    "map": float(map_nota.valor) if map_nota else None,
                    "macs": float(macs) if macs is not None else None,
                    "acp": float(acp_nota.valor) if acp_nota else None,
                    "mt": int(mt) if mt is not None else None,
                    "com": com
                }
            
            # MFD calculation
            mt1 = disc_data["trimesters"][1]["mt"]
            mt2 = disc_data["trimesters"][2]["mt"]
            mt3 = disc_data["trimesters"][3]["mt"]
            mfd = AvaliacaoService.calculate_mfd(mt1, mt2, mt3)
            disc_data["mfd"] = float(mfd) if mfd is not None else None
            
            report.append(disc_data)
            
        return Response(report, status=status.HTTP_200_OK)

class ProfessorViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de professores.
    """
    queryset = Professor.objects.all()
    serializer_class = ProfessorSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        if user.school:
            return self.queryset.filter(school=user.school)
        return self.queryset.none()

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)

    @action(detail=True, methods=['get'])
    def atribuicoes(self, request, pk=None):
        """
        Retorna as atribuições (Turma/Disciplina) deste professor.
        """
        professor = self.get_object()
        from .models import ProfessorTurmaDisciplina
        atribuicoes = ProfessorTurmaDisciplina.objects.filter(professor=professor)
        
        data = []
        for a in atribuicoes:
            data.append({
                "id": a.id,
                "turma_id": a.turma.id,
                "turma_nome": f"{a.turma.nome} ({a.turma.class_name if hasattr(a.turma, 'class_name') else a.turma.ano_letivo})", # Fallback for name
                "disciplina_id": a.disciplina.id,
                "disciplina_nome": a.disciplina.nome,
                "ano_letivo": a.turma.ano_letivo
            })
        return Response(data)

    @action(detail=False, methods=['get'])
    def minhas_atribuicoes(self, request):
        """
        Retorna as atribuições do professor logado.
        """
        try:
            professor = Professor.objects.get(user=request.user)
        except Professor.DoesNotExist:
            return Response({"error": "Perfil de professor não encontrado para este usuário."}, status=status.HTTP_404_NOT_FOUND)

        from .models import ProfessorTurmaDisciplina
        atribuicoes = ProfessorTurmaDisciplina.objects.filter(professor=professor)
        
        data = []
        for a in atribuicoes:
            data.append({
                "id": a.id,
                "turma_id": a.turma.id,
                "turma_nome": a.turma.nome,
                "disciplina_id": a.disciplina.id,
                "disciplina_nome": a.disciplina.nome,
                "ano_letivo": a.turma.ano_letivo
            })
        return Response(data)

class DAEViewSet(viewsets.ViewSet):
    """
    ViewSet para o Director Adjunto de Escola (DAE).
    """
    permission_classes = [IsAuthenticated, IsDAE | IsDAP | IsAdminEscola | IsAdministrativo, IsSchoolNotBlocked]

    @action(detail=False, methods=['post'])
    def atribuir_cargo(self, request):
        serializer = ProfessorCargoAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            result = DAEService.atribuir_cargo(
                school=request.user.school,
                **serializer.validated_data
            )
            if result['status'] == 'error':
                return Response(result, status=status.HTTP_400_BAD_REQUEST)
            return Response(result, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def estatisticas_alunos(self, request):
        stats = DAEService.get_estatisticas_alunos(request.user.school)
        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def estatisticas_disciplinas(self, request):
        stats = DAEService.get_estatisticas_disciplinas(request.user.school)
        return Response(stats, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def estatisticas_aproveitamento(self, request):
        stats = DAEService.get_estatisticas_aproveitamento(request.user.school)
        return Response(stats, status=status.HTTP_200_OK)

class TurmaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de turmas e operações pedagógicas.
    """
    queryset = Turma.objects.all()
    serializer_class = TurmaSerializer

    def get_permissions(self):
        """
        Professores/Alunos só podem listar.
        Criar/editar/deletar requer permissões administrativas.
        """
        if self.action in ['list', 'retrieve', 'disciplinas']:
            return [IsAuthenticated(), IsSchoolNotBlocked()]
        if self.action in ['disciplinas_atribuidas']:
            return [IsAuthenticated(), IsSchoolNotBlocked(), (IsAdminEscola | IsDAP | IsAdministrativo | IsDT)()]
        return [IsAuthenticated(), IsSchoolNotBlocked(), (IsAdminEscola | IsDAP | IsAdministrativo)()]

    def get_queryset(self):
        # Isolamento por escola
        user = self.request.user
        if user.school:
            return self.queryset.filter(school=user.school)
        return self.queryset.none()

    @action(detail=False, methods=['post'], permission_classes=[IsAdminEscola | IsDAP | IsAdministrativo, IsSchoolNotBlocked])
    def formar_turmas(self, request):
        """
        Endpoint para disparar a formação automática de turmas.
        """
        classe_id = request.data.get('classe_id')
        ano_letivo = request.data.get('ano_letivo')
        min_alunos = request.data.get('min_alunos', 20)
        max_alunos = request.data.get('max_alunos', 50)
        naming_convention = request.data.get('naming_convention', 'ALPHABETIC')

        if not all([classe_id, ano_letivo]):
            return Response(
                {"error": "classe_id e ano_letivo são obrigatórios."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            classe = Classe.objects.get(id=classe_id, school=request.user.school)
        except Classe.DoesNotExist:
            return Response(
                {"error": "Classe não encontrada nesta escola."},
                status=status.HTTP_404_NOT_FOUND
            )

        result = FormacaoTurmaService.distribuir_alunos(
            school=request.user.school,
            classe=classe,
            ano_letivo=ano_letivo,
            min_alunos=int(min_alunos),
            max_alunos=int(max_alunos),
            naming_convention=naming_convention
        )

        if result['status'] == 'error':
            return Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def disciplinas(self, request, pk=None):
        """
        Retorna as disciplinas desta turma (baseadas na escola/curriculo) e seus professores.
        """
        turma = self.get_object()
        school = request.user.school
        
        # 1. Obter todas as disciplinas da escola
        disciplinas = Disciplina.objects.filter(school=school).order_by('nome')
        
        # 2. Obter atribuições atuais
        from .models import ProfessorTurmaDisciplina
        atribuicoes = ProfessorTurmaDisciplina.objects.filter(turma=turma).select_related('professor__user')
        atribuicoes_map = {a.disciplina_id: a.professor for a in atribuicoes}
        
        resultado = []
        for disc in disciplinas:
            prof = atribuicoes_map.get(disc.id)
            resultado.append({
                "id": disc.id,
                "nome": disc.nome,
                "professor_id": prof.id if prof else None,
                "professor_nome": prof.user.get_full_name() if prof else None
            })
            
        return Response(resultado, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def disciplinas_atribuidas(self, request, pk=None):
        """
        Retorna apenas disciplinas com professor atribuído para esta turma.
        """
        turma = self.get_object()
        if request.user.role not in ['ADMIN_ESCOLA', 'ADMIN_SISTEMA', 'DAP', 'DAE', 'ADMINISTRATIVO']:
            from .models import DirectorTurma
            is_dt = DirectorTurma.objects.filter(professor__user=request.user, turma=turma).exists()
            if not is_dt:
                return Response({"error": "Permissão negada."}, status=status.HTTP_403_FORBIDDEN)
        from .models import ProfessorTurmaDisciplina
        atribuicoes = ProfessorTurmaDisciplina.objects.filter(turma=turma).select_related('disciplina', 'professor__user')
        
        resultado = []
        for atrib in atribuicoes:
            resultado.append({
                "id": atrib.disciplina.id,
                "nome": atrib.disciplina.nome,
                "professor_id": atrib.professor.id if atrib.professor else None,
                "professor_nome": atrib.professor.user.get_full_name() if atrib.professor else None
            })
            
        return Response(resultado, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminEscola | IsDAP | IsAdministrativo, IsSchoolNotBlocked])
    def atribuir_professor(self, request, pk=None):
        """
        Atribui ou remove um professor de uma disciplina nesta turma.
        """
        turma = self.get_object()
        school = request.user.school
        
        from .serializers import AtribuicaoDisciplinaSerializer
        serializer = AtribuicaoDisciplinaSerializer(data=request.data)
        
        if serializer.is_valid():
            disc_id = serializer.validated_data['disciplina_id']
            prof_id = serializer.validated_data['professor_id']
            
            try:
                disciplina = Disciplina.objects.get(id=disc_id, school=school)
            except Disciplina.DoesNotExist:
                return Response({"error": "Disciplina não encontrada."}, status=status.HTTP_404_NOT_FOUND)
            
            from .models import ProfessorTurmaDisciplina
            
            if prof_id:
                try:
                    prof = Professor.objects.get(id=prof_id, school=school)
                    
                    # Check if professor teaches this subject (optional validation, but good practice)
                    # if not prof.disciplinas.filter(id=disc_id).exists():
                    #     return Response({"warning": "Professor não tem esta disciplina em sua lista."}, status=status.HTTP_200_OK)
                        
                except Professor.DoesNotExist:
                     return Response({"error": "Professor não encontrado."}, status=status.HTTP_404_NOT_FOUND)
                
                # Create or Update
                check, created = ProfessorTurmaDisciplina.objects.update_or_create(
                    turma=turma,
                    disciplina=disciplina,
                    defaults={
                        'professor': prof, 
                        'school': school
                    }
                )
                
                return Response({"status": "success", "message": f"Professor {prof} atribuído à {disciplina.nome}."}, status=status.HTTP_200_OK)
            else:
                # Remove assignment
                ProfessorTurmaDisciplina.objects.filter(turma=turma, disciplina=disciplina).delete()
                return Response({"status": "success", "message": f"Atribuição removida de {disciplina.nome}."}, status=status.HTTP_200_OK)
                
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ClasseViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para listagem de classes.
    """
    queryset = Classe.objects.all()
    serializer_class = ClasseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.school:
            return self.queryset.filter(school=user.school)
        return self.queryset.none()

    @action(detail=False, methods=['post'], permission_classes=[IsAdminEscola | IsDAP | IsAdministrativo])
    def setup_academico(self, request):
        """
        Gera automaticamente as classes e disciplinas iniciais da escola.
        """
        school = request.user.school
        
        # 1. Seed Classes
        res_classes = FormacaoTurmaService.seed_classes(school)
        
        # 2. Seed Disciplinas dependendo do tipo
        if school.school_type == 'PRIMARIA':
            res_disc = FormacaoTurmaService.seed_disciplinas_primaria(school)
        else:
            incluir_1 = school.school_type in ['SECUNDARIA_1', 'SECUNDARIA_COMPLETA']
            incluir_2 = school.school_type in ['SECUNDARIA_2', 'SECUNDARIA_COMPLETA']
            res_disc = FormacaoTurmaService.seed_disciplinas_secundaria(
                school=school,
                incluir_ciclo_1=incluir_1,
                incluir_ciclo_2=incluir_2
            )
            
        return Response({
            "status": "success",
            "message": "Estrutura académica inicial configurada com sucesso.",
            "classes": res_classes['classes'],
            "disciplinas": res_disc['disciplinas']
        }, status=status.HTTP_201_CREATED)


class DisciplinaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestão de disciplinas.
    """
    queryset = Disciplina.objects.all()
    serializer_class = DisciplinaSerializer
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def get_queryset(self):
        user = self.request.user
        if user.school:
            return self.queryset.filter(school=user.school)
        return self.queryset.none()

    def perform_create(self, serializer):
        serializer.save(school=self.request.user.school)

    @action(detail=False, methods=['post'], permission_classes=[IsAdministrativo])
    def seed_primaria(self, request):
        """
        Cria automaticamente as disciplinas do currículo primário.
        """
        result = FormacaoTurmaService.seed_disciplinas_primaria(request.user.school)
        return Response(result, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], permission_classes=[IsAdministrativo])
    def seed_secundaria(self, request):
        """
        Cria automaticamente as disciplinas do currículo secundário.
        """
        # Podemos ler do request quais ciclos incluir, ou basear no school_type
        school = request.user.school
        incluir_1 = school.school_type in ['SECUNDARIA_1', 'SECUNDARIA_COMPLETA']
        incluir_2 = school.school_type in ['SECUNDARIA_2', 'SECUNDARIA_COMPLETA']
        
        result = FormacaoTurmaService.seed_disciplinas_secundaria(
            school=school,
            incluir_ciclo_1=incluir_1,
            incluir_ciclo_2=incluir_2
        )
        return Response(result, status=status.HTTP_201_CREATED)

class RelatorioViewSet(viewsets.ViewSet):
    """
    ViewSet para pautas e relatórios.
    """
    permission_classes = [IsAuthenticated, IsSchoolNotBlocked]

    def _is_report_admin(self, user):
        return user.role in ['ADMIN_ESCOLA', 'DAP', 'ADMINISTRATIVO']

    def _can_view_pauta(self, user, turma):
        if self._is_report_admin(user):
            return True
        if user.role != 'PROFESSOR':
            return False
        if DirectorTurma.objects.filter(professor__user=user, turma=turma).exists():
            return True
        return CoordenadorClasse.objects.filter(professor__user=user, classe=turma.classe).exists()

    def _can_view_declaracao(self, user, aluno):
        if self._is_report_admin(user):
            return True
        if user.role != 'PROFESSOR':
            return False
        if not aluno.turma_atual:
            return False
        return DirectorTurma.objects.filter(professor__user=user, turma=aluno.turma_atual).exists()

    @action(detail=False, methods=['get'])
    def pauta_turma(self, request):
        turma_id = request.query_params.get('turma_id')
        disciplina_id = request.query_params.get('disciplina_id')
        if not all([turma_id, disciplina_id]):
            return Response({"error": "turma_id e disciplina_id são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            turma = Turma.objects.get(id=turma_id, school=request.user.school)
            disciplina = Disciplina.objects.get(id=disciplina_id, school=request.user.school)
        except (Turma.DoesNotExist, Disciplina.DoesNotExist):
            return Response({"error": "Turma ou Disciplina não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not self._can_view_pauta(request.user, turma):
            return Response({"error": "Sem permissão para visualizar esta pauta."}, status=status.HTTP_403_FORBIDDEN)

        from salamandra_sge.academico.models import ProfessorTurmaDisciplina
        if not ProfessorTurmaDisciplina.objects.filter(turma=turma, disciplina=disciplina).exists():
            return Response({"error": "Disciplina não atribuída a esta turma."}, status=status.HTTP_400_BAD_REQUEST)

        from salamandra_sge.avaliacoes.models import Nota
        from salamandra_sge.avaliacoes.services import AvaliacaoService
        
        alunos = Aluno.objects.filter(turma_atual=turma, ativo=True).order_by('numero_turma', 'nome_completo')
        
        pauta = []
        for aluno in alunos:
            aluno_data = {
                "id": aluno.id,
                "numero_turma": aluno.numero_turma,
                "nome": aluno.nome_completo,
                "sexo": aluno.sexo[0] if aluno.sexo else "",
                "trimesters": {}
            }
            
            for tri in [1, 2, 3]:
                notas = Nota.objects.filter(aluno=aluno, disciplina=disciplina, trimestre=tri)
                acs_list = notas.filter(tipo__in=['ACS1', 'ACS2', 'ACS3']).order_by('tipo')
                map_nota = notas.filter(tipo='MAP').first()
                acp_nota = notas.filter(tipo='ACP').first()
                
                macs = AvaliacaoService.calculate_macs(acs_list, map_nota)
                mt = None
                com = None
                
                if acp_nota and acp_nota.valor is not None:
                    mt = AvaliacaoService.calculate_mt(macs, acp_nota.valor)
                    com = AvaliacaoService.get_comportamento(mt)
                
                aluno_data["trimesters"][tri] = {
                    "acs": [float(n.valor) for n in acs_list if n.valor is not None],
                    "map": float(map_nota.valor) if map_nota else None,
                    "macs": float(macs) if macs is not None else None,
                    "acp": float(acp_nota.valor) if acp_nota else None,
                    "mt": int(mt) if mt is not None else None,
                    "com": com
                }

            # MFD calculation
            mt1 = aluno_data["trimesters"][1]["mt"]
            mt2 = aluno_data["trimesters"][2]["mt"]
            mt3 = aluno_data["trimesters"][3]["mt"]
            mfd = AvaliacaoService.calculate_mfd(mt1, mt2, mt3)
            aluno_data["mfd"] = float(mfd) if mfd is not None else None
            
            pauta.append(aluno_data)

        return Response({
            "escola": request.user.school.name,
            "turma": turma.nome,
            "disciplina": disciplina.nome,
            "classe": turma.classe.nome,
            "ano_letivo": turma.ano_letivo,
            "pauta": pauta
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def pauta_turma_geral(self, request):
        turma_id = request.query_params.get('turma_id')
        trimestre = request.query_params.get('trimestre')
        if not all([turma_id, trimestre]):
            return Response({"error": "turma_id e trimestre são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)

        if not str(trimestre).isdigit():
            return Response({"error": "trimestre inválido."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            turma = Turma.objects.get(id=turma_id, school=request.user.school)
        except Turma.DoesNotExist:
            return Response({"error": "Turma não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        if not self._can_view_pauta(request.user, turma):
            return Response({"error": "Sem permissão para visualizar esta pauta."}, status=status.HTTP_403_FORBIDDEN)

        from salamandra_sge.academico.models import ProfessorTurmaDisciplina
        from salamandra_sge.avaliacoes.models import ResumoTrimestral
        from salamandra_sge.avaliacoes.services import AvaliacaoService
        
       
        ano_letivo = turma.ano_letivo
        disciplinas = Disciplina.objects.filter(
            id__in=ProfessorTurmaDisciplina.objects.filter(
                turma=turma, school=request.user.school
            ).values_list('disciplina_id', flat=True)
        ).order_by('nome')

        if not disciplinas.exists():
            return Response(
                {"error": "Nenhuma disciplina atribuída a esta turma."},
                status=status.HTTP_400_BAD_REQUEST
            )

        resumos = ResumoTrimestral.objects.filter(
            turma=turma,
            ano_letivo=ano_letivo,
            trimestre=int(trimestre)
        )
        resumo_map = {(r.aluno_id, r.disciplina_id): r for r in resumos}

        alunos = Aluno.objects.filter(turma_atual=turma, ativo=True).order_by('nome_completo')
        pauta = []

        for aluno in alunos:
            disciplinas_data = {}
            mts = []
            for disc in disciplinas:
                resumo = resumo_map.get((aluno.id, disc.id))
                mt_val = float(resumo.mt) if resumo and resumo.mt is not None else None
                disciplinas_data[disc.id] = mt_val
                if mt_val is not None:
                    mts.append(mt_val)

            media_final = (sum(mts) / len(mts)) if mts else None
            pauta.append({
                "id": aluno.id,
                "nome": aluno.nome_completo,
                "disciplinas": disciplinas_data,
                "media_final": round(media_final, 2) if media_final is not None else None,
                "situacao": "Aprovado" if media_final is not None and media_final >= 10 else "Reprovado" if media_final is not None else "Sem dados"
            })

        return Response({
            "escola": request.user.school.name,
            "turma": turma.nome,
            "classe": turma.classe.nome,
            "ano_letivo": ano_letivo,
            "trimestre": int(trimestre),
            "disciplinas": [{"id": d.id, "nome": d.nome} for d in disciplinas],
            "pauta": pauta
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def resumo_escola(self, request):
        total_alunos = Aluno.objects.filter(school=request.user.school, ativo=True).count()
        total_turmas = Turma.objects.filter(school=request.user.school).count()
        total_professores = Professor.objects.filter(school=request.user.school).count()
        
        return Response({
            "total_alunos": total_alunos,
            "total_turmas": total_turmas,
            "total_professores": total_professores
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def declaracao_aluno(self, request):
        aluno_id = request.query_params.get('aluno_id')
        if not aluno_id:
            return Response({"error": "aluno_id é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            aluno = Aluno.objects.get(id=aluno_id, school=request.user.school)
        except Aluno.DoesNotExist:
            return Response({"error": "Aluno não encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if not self._can_view_declaracao(request.user, aluno):
            return Response({"error": "Sem permissão para visualizar esta declaração."}, status=status.HTTP_403_FORBIDDEN)

        turma = aluno.turma_atual
        if not turma:
            return Response({"error": "Aluno sem turma atual."}, status=status.HTTP_400_BAD_REQUEST)

        from salamandra_sge.avaliacoes.models import ResumoTrimestral
        from salamandra_sge.avaliacoes.services import AvaliacaoService
        
        ano_letivo = turma.ano_letivo
        from salamandra_sge.academico.models import ProfessorTurmaDisciplina
        disciplinas = Disciplina.objects.filter(
            id__in=ProfessorTurmaDisciplina.objects.filter(
                turma=turma, school=request.user.school
            ).values_list('disciplina_id', flat=True)
        ).order_by('nome')
        resumos = ResumoTrimestral.objects.filter(
            aluno=aluno,
            ano_letivo=ano_letivo
        )
        resumo_map = {}
        for r in resumos:
            resumo_map[(r.disciplina_id, r.trimestre)] = r

        disciplinas_data = []
        overall_status = "Sem dados"
        has_any = False
        has_reprovado = False

        for disc in disciplinas:
            mt1 = resumo_map.get((disc.id, 1))
            mt2 = resumo_map.get((disc.id, 2))
            mt3 = resumo_map.get((disc.id, 3))

            mts = [
                int(mt1.mt) if mt1 and mt1.mt is not None else None,
                int(mt2.mt) if mt2 and mt2.mt is not None else None,
                int(mt3.mt) if mt3 and mt3.mt is not None else None,
            ]
            mfd = AvaliacaoService.calculate_mfd(mts[0], mts[1], mts[2])

            if mfd is not None:
                has_any = True
                if mfd < 10:
                    has_reprovado = True

            disciplinas_data.append({
                "disciplina_id": disc.id,
                "disciplina_nome": disc.nome,
                "trimestres": {
                    1: mts[0],
                    2: mts[1],
                    3: mts[2],
                },
                "mfd": float(mfd) if mfd is not None else None,
                "situacao": "Aprovado" if mfd is not None and mfd >= 10 else "Reprovado" if mfd is not None else "Sem dados"
            })

        if has_any:
            overall_status = "Reprovado" if has_reprovado else "Aprovado"

        return Response({
            "aluno": {
                "id": aluno.id,
                "nome": aluno.nome_completo
            },
            "turma": turma.nome,
            "classe": turma.classe.nome,
            "ano_letivo": ano_letivo,
            "disciplinas": disciplinas_data,
            "situacao_final": overall_status
        }, status=status.HTTP_200_OK)

class DirectorTurmaViewSet(viewsets.ViewSet):
    """
    Operações para o Director de Turma.
    """
    permission_classes = [IsAuthenticated, IsDT, IsSchoolNotBlocked]

    @action(detail=False, methods=['get'])
    def minha_turma(self, request):
        try:
            dt_obj = DirectorTurma.objects.get(professor__user=request.user)
            stats = AcademicRoleService.get_turma_stats(dt_obj.turma)
            return Response({
                "turma": dt_obj.turma.nome,
                "classe": dt_obj.turma.classe.nome,
                "estatisticas": stats
            })
        except DirectorTurma.DoesNotExist:
            return Response({"error": "Você não é DT de nenhuma turma."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def detalhes_turma(self, request):
        try:
            dt_obj = DirectorTurma.objects.get(professor__user=request.user)
            details = AcademicRoleService.get_turma_detailed_stats(dt_obj.turma)
            return Response(details)
        except DirectorTurma.DoesNotExist:
            return Response({"error": "DT não encontrado."}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def atribuir_cargo_aluno(self, request):
        aluno_id = request.data.get('aluno_id')
        cargo = request.data.get('cargo')
        
        if not aluno_id or not cargo:
            return Response({"error": "aluno_id e cargo são obrigatórios."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            dt_obj = DirectorTurma.objects.get(professor__user=request.user)
            aluno = Aluno.objects.get(id=aluno_id, turma_atual=dt_obj.turma)
            aluno.cargo_turma = cargo
            aluno.save()
            return Response({"status": "success", "message": f"Cargo '{cargo}' atribuído a {aluno.nome_completo}."})
        except (DirectorTurma.DoesNotExist, Aluno.DoesNotExist):
            return Response({"error": "Aluno não pertence à sua turma ou você não é DT."}, status=status.HTTP_403_FORBIDDEN)

    @action(detail=False, methods=['get'])
    def alunos(self, request):
        dt_obj = DirectorTurma.objects.get(professor__user=request.user)
        alunos = Aluno.objects.filter(turma_atual=dt_obj.turma) # Removed ativo=True to show all for management
        serializer = AlunoSerializer(alunos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def mover_aluno(self, request):
        aluno_id = request.data.get('aluno_id')
        nova_turma_id = request.data.get('nova_turma_id')
        
        try:
            dt_obj = DirectorTurma.objects.get(professor__user=request.user)
            aluno = Aluno.objects.get(id=aluno_id, turma_atual=dt_obj.turma)
            
            # Verify if new turma belongs to the same class (optional but recommended)
            nova_turma = Turma.objects.get(id=nova_turma_id, school=request.user.school)
            
            # Move
            aluno.turma_atual = nova_turma
            aluno.cargo_turma = 'Nenhum' # Reset cargo on move
            aluno.save()
            
            return Response({"status": "success", "message": f"Aluno {aluno.nome_completo} movido para {nova_turma.nome}."})
            
        except (DirectorTurma.DoesNotExist, Aluno.DoesNotExist, Turma.DoesNotExist):
            return Response({"error": "Dados inválidos ou permissão negada."}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def transferir_aluno(self, request):
        serializer = TransferenciaAlunoSerializer(data=request.data)
        if serializer.is_valid():
            aluno_id = request.data.get('aluno_id') # Serializer might expect this or we pass it manually if using simple data
            # Adjusting to likely usage: request data should match serializer expectation or we manually handle
            # Assuming serializer expects 'escola_destino', 'motivo' and we find aluno by ID
            
            try:
                dt_obj = DirectorTurma.objects.get(professor__user=request.user)
                # Need explicit aluno_id in request if not using detail=True
                if not aluno_id:
                     return Response({"error": "aluno_id é obrigatório."}, status=status.HTTP_400_BAD_REQUEST)

                aluno = Aluno.objects.get(id=aluno_id, turma_atual=dt_obj.turma)
                
                aluno.ativo = False
                aluno.situacao_social = 'TRANSFERIDO' # Optional status update
                # Log transfer details if needed
                aluno.save()
                
                return Response({"status": "success", "message": f"Aluno {aluno.nome_completo} transferido."})
            
            except (DirectorTurma.DoesNotExist, Aluno.DoesNotExist):
                return Response({"error": "Aluno não encontrado na sua turma."}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def definir_status_aluno(self, request):
        aluno_id = request.data.get('aluno_id')
        novo_status = request.data.get('status') # 'ATIVO', 'DESISTENTE', 'TRANSFERIDO'
        
        try:
            dt_obj = DirectorTurma.objects.get(professor__user=request.user)
            aluno = Aluno.objects.get(id=aluno_id, turma_atual=dt_obj.turma)
            
            # Validar status
            valid_statuses = [choice[0] for choice in Aluno.ALUNO_STATUS_CHOICES]
            if novo_status not in valid_statuses:
                return Response({"error": "Status inválido."}, status=status.HTTP_400_BAD_REQUEST)
            
            aluno.status = novo_status
            aluno.save()
            
            return Response({"status": "success", "message": f"Status do aluno {aluno.nome_completo} alterado para {aluno.get_status_display()}."})
        except (DirectorTurma.DoesNotExist, Aluno.DoesNotExist):
             return Response({"error": "Aluno não encontrado."}, status=status.HTTP_404_NOT_FOUND)

class CoordenadorClasseViewSet(viewsets.ViewSet):
    """
    Operações para o Coordenador de Classe.
    """
    permission_classes = [IsAuthenticated, IsCC, IsSchoolNotBlocked]

    @action(detail=False, methods=['get'])
    def resumo_classe(self, request):
        ccs = CoordenadorClasse.objects.filter(professor__user=request.user)
        resumo = []
        for cc in ccs:
            resumo.append(AcademicRoleService.get_classe_stats(cc.classe, request.user.school))
        return Response(resumo)

    @action(detail=False, methods=['get'])
    def turmas_classe(self, request):
        # Assumindo que pode coordenar mais de uma classe, ou retorna da primeira
        ccs = CoordenadorClasse.objects.filter(professor__user=request.user)
        data = []
        for cc in ccs:
            turmas_data = AcademicRoleService.get_classe_turmas(cc.classe, request.user.school)
            data.append({
                "classe": cc.classe.nome,
                "turmas": turmas_data
            })
        return Response(data)

    @action(detail=False, methods=['post'])
    def inscrever_aluno(self, request):
        # Permitir que CC inscreva aluno na classe que coordena
        serializer = AlunoSerializer(data=request.data)
        if serializer.is_valid():
            classe_id = serializer.validated_data.get('classe_atual').id
            if not CoordenadorClasse.objects.filter(professor__user=request.user, classe_id=classe_id).exists():
                return Response({"error": "Você não coordena esta classe."}, status=status.HTTP_403_FORBIDDEN)
            serializer.save(school=request.user.school)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class DelegadoDisciplinaViewSet(viewsets.ViewSet):
    """
    Operações para o Delegado de Disciplina.
    """
    permission_classes = [IsAuthenticated, IsDD, IsSchoolNotBlocked]

    @action(detail=False, methods=['get'])
    def resumo_disciplina(self, request):
        dds = DelegadoDisciplina.objects.filter(professor__user=request.user)
        resumo = []
        for dd in dds:
            resumo.append(AcademicRoleService.get_disciplina_stats(dd.disciplina, request.user.school))
        return Response(resumo)

    @action(detail=False, methods=['get'])
    def detalhes_disciplina(self, request):
        dds = DelegadoDisciplina.objects.filter(professor__user=request.user)
        details = []
        for dd in dds:
            details.append(AcademicRoleService.get_disciplina_details(dd.disciplina, request.user.school))
        return Response(details)
