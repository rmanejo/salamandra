from django.db import transaction
from .models import Aluno, Turma, Classe, Disciplina

class FormacaoTurmaService:
    """
    Serviço para automatizar a distribuição de alunos em turmas.
    """

    @staticmethod
    @transaction.atomic
    def distribuir_alunos(school, classe, ano_letivo, min_alunos, max_alunos, naming_convention='ALPHABETIC'):
        """
        Distribui alunos inscritos numa classe em turmas existentes.
        Ordenação: Alunos mais novos primeiro.
        """
        # 1. Buscar alunos da classe/escola sem turma
        alunos = Aluno.objects.filter(
            school=school,
            classe_atual=classe,
            turma_atual__isnull=True,
            ativo=True
        ).order_by('-data_nascimento') # Mais novos primeiro (data nascimento maior/mais recente)

        total_alunos = alunos.count()
        if total_alunos == 0:
            return {"status": "error", "message": "Nenhum aluno sem turma encontrado para esta classe."}

        # 2. Buscar turmas disponíveis para esta classe
        # 2. Buscar turmas disponíveis
        turmas = list(Turma.objects.filter(
            school=school,
            classe=classe,
            ano_letivo=ano_letivo
        ).order_by('nome'))

        num_turmas = len(turmas)
        
        # Calcular turmas necessárias
        import math
        turmas_necessarias = math.ceil(total_alunos / max_alunos)
        
        # Se não houver turmas ou forem insuficientes, criar novas
        if num_turmas < turmas_necessarias:
            
            existing_names = [t.nome for t in turmas]
            count_created = 0
            needed = turmas_necessarias - num_turmas
            
            # Helper para gerar nomes baseados na convenção
            def get_name(index, convention, classe_nome):
                # Extract prefix "7ª" from "7ª Classe"
                prefix = classe_nome.split(' ')[0] if classe_nome else ""
                
                suffix = ""
                if convention == 'NUMERIC':
                    suffix = str(index + 1)
                elif convention == 'ROMAN':
                    # Simplificado para casos comuns (até 20)
                    val = [
                        1000, 900, 500, 400,
                        100, 90, 50, 40,
                        10, 9, 5, 4,
                        1
                        ]
                    syb = [
                        "M", "CM", "D", "CD",
                        "C", "XC", "L", "XL",
                        "X", "IX", "V", "IV",
                        "I"
                        ]
                    num = index + 1
                    roman_num = ''
                    i = 0
                    while  num > 0:
                        for _ in range(num // val[i]):
                            roman_num += syb[i]
                            num -= val[i]
                        i += 1
                    suffix = roman_num
                else: # ALPHABETIC (Default)
                    import string
                    letras = string.ascii_uppercase
                    if index < len(letras):
                        suffix = letras[index]
                    else:
                        suffix = f"T{index+1}" # Fallback
                
                return f"{prefix}{suffix}"
            
            # Tenta gerar nomes sequenciais até satisfazer a necessidade
            # Começamos de 0 até encontrar nomes livres
            curr_idx = 0
            while count_created < needed:
                # Loop de segurança para não infinito
                if curr_idx > 100: 
                    break
                    
                nome_cand = get_name(curr_idx, naming_convention, classe.nome)
                if nome_cand not in existing_names:
                    # Verifica se já existe na base (caso existing_names fosse só do filtro inicial que pode estar stale, mas aqui trust no db state seria melhor, mas nomes únicos por classe/ano/escola)
                    # O turmas inicial já filtrou school/classe/ano.
                    
                    try:
                        nova_turma = Turma.objects.create(
                            school=school,
                            classe=classe,
                            ano_letivo=ano_letivo,
                            nome=nome_cand
                        )
                        turmas.append(nova_turma)
                        existing_names.append(nome_cand)
                        count_created += 1
                    except Exception as e:
                        # Pode dar erro de unique constraint se houver race condition ou outra turma criada
                        pass
                
                curr_idx += 1
                
            # Recarregar/reordenar lista final
            # Ordenação customizada complexa, vamos ordenar por ID de criação para simplificar distribuição
            turmas.sort(key=lambda x: x.id) 
            num_turmas = len(turmas)

        # 3. Validar validação de capacidade (agora deve ter capacidade suficiente)
        capacidade_total = num_turmas * max_alunos
        if total_alunos > capacidade_total:
             # Isso só acontece se estourou muito o limite (ex: > 26 turmas se usarmos só A-Z)
            return {
                "status": "warning", 
                "message": f"Total de alunos ({total_alunos}) excede a capacidade calculada mesmo criando turmas."
            }

        # 4. Distribuição Equilibrada (Round-robin simplificado)
        # Distribuímos os alunos sorted pela lista de turmas
        idx_turma = 0
        atribuicoes = 0
        
        for aluno in alunos:
            turma_destino = turmas[idx_turma]
            aluno.turma_atual = turma_destino
            aluno.save()
            
            atribuicoes += 1
            # Passa para a próxima turma
            idx_turma = (idx_turma + 1) % num_turmas

        return {
            "status": "success",
            "message": f"Sucesso! {atribuicoes} alunos distribuídos por {num_turmas} turmas.",
            "detalhes": {
                "total_alunos": total_alunos,
                "num_turmas": num_turmas
            }
        }

    @staticmethod
    @transaction.atomic
    def seed_disciplinas_primaria(school):
        """
        Cria as disciplinas obrigatórias para escolas primárias.
        """
        # Template 1-3
        disciplinas_base = ['Português', 'Matemática', 'Educação Física']
        # Template 4-6 (Adicionais)
        disciplinas_avancadas = ['Ciências Naturais', 'Ciências Sociais', 'EV/Ofícios']
        
        todas = list(set(disciplinas_base + disciplinas_avancadas))
        
        criadas = 0
        existentes = 0
        
        for nome in todas:
            # check if exists
            disciplina, created = Disciplina.objects.get_or_create(
                school=school,
                nome=nome
            )
            if created:
                criadas += 1
            else:
                existentes += 1
                
        return {
            "status": "success",
            "message": f"Seeding concluído: {criadas} novas disciplinas criadas, {existentes} já existiam.",
            "disciplinas": todas
        }

    @staticmethod
    @transaction.atomic
    def seed_disciplinas_secundaria(school, incluir_ciclo_1=True, incluir_ciclo_2=True):
        """
        Cria as disciplinas obrigatórias para escolas secundárias.
        """
        # 1º Ciclo (7ª-9ª)
        ciclo_1 = [
            'Português', 'Inglês', 'Francês', 'História', 'Geografia',
            'Química', 'Física', 'Biologia', 'Matemática',
            'Agro-Pecuária', 'TICs', 'Educação Visual', 'Educação Física'
        ]
        
        # 2º Ciclo (10ª-12ª) - Sem profissionais, adiciona Filosofia e DGD
        ciclo_2 = [
            'Português', 'Inglês', 'Francês', 'História', 'Geografia',
            'Química', 'Física', 'Biologia', 'Matemática',
            'Educação Física', 'Filosofia', 'DGD'
        ]
        
        todas_set = set()
        if incluir_ciclo_1:
            todas_set.update(ciclo_1)
        if incluir_ciclo_2:
            todas_set.update(ciclo_2)
            
        todas = sorted(list(todas_set))
        
        criadas = 0
        existentes = 0
        
        for nome in todas:
            disciplina, created = Disciplina.objects.get_or_create(
                school=school,
                nome=nome
            )
            if created:
                criadas += 1
            else:
                existentes += 1
                
        return {
            "status": "success",
            "message": f"Seeding Secundário concluído: {criadas} novas criadas, {existentes} existentes.",
            "disciplinas": todas
        }

    @staticmethod
    @transaction.atomic
    def seed_classes(school):
        """
        Cria as classes baseadas no tipo de escola.
        """
        classes_map = {
            'PRIMARIA': [f'{i}ª Classe' for i in range(1, 7)],
            'SECUNDARIA_1': [f'{i}ª Classe' for i in range(7, 10)],
            'SECUNDARIA_2': [f'{i}ª Classe' for i in range(10, 13)],
            'SECUNDARIA_COMPLETA': [f'{i}ª Classe' for i in range(7, 13)],
        }
        
        nomes_classes = classes_map.get(school.school_type, [])
        criadas = 0
        existentes = 0
        
        for nome in nomes_classes:
            classe, created = Classe.objects.get_or_create(
                school=school,
                nome=nome
            )
            if created:
                criadas += 1
            else:
                existentes += 1
                
        return {
            "status": "success",
            "message": f"Seeding de Classes concluído: {criadas} novas criadas, {existentes} existentes.",
            "classes": nomes_classes
        }

class DAEService:
    """
    Serviço para o Director Adjunto de Escola (DAE).
    Gere atribuições de cargos e visualização de estatísticas.
    """

    @staticmethod
    @transaction.atomic
    def atribuir_cargo(school, professor_id, cargo_tipo, entidade_id, ano_letivo):
        from .models import Professor, Turma, Classe, Disciplina, DirectorTurma, CoordenadorClasse, DelegadoDisciplina
        
        try:
            if professor_id is None:
                professor = None
            else:
                professor = Professor.objects.get(id=professor_id, school=school)
        except Professor.DoesNotExist:
            return {"status": "error", "message": "Professor não encontrado."}

        if cargo_tipo == 'DT':
            if professor is None:
                 DirectorTurma.objects.filter(turma_id=entidade_id, school=school).delete()
                 return {"status": "success", "message": "Director de Turma removido."}
                 
            try:
                turma = Turma.objects.get(id=entidade_id, school=school)
                DirectorTurma.objects.update_or_create(
                    turma=turma,
                    defaults={'professor': professor, 'school': school, 'ano_letivo': ano_letivo}
                )
                return {"status": "success", "message": f"Professor {professor} atribuído como DT da turma {turma}."}
            except Turma.DoesNotExist:
                return {"status": "error", "message": "Turma não encontrada."}

        elif cargo_tipo == 'CC':
            # Um CC só pode ser duma classe e uma classe só um CC (Exclusividade Mútua)
            if CoordenadorClasse.objects.filter(professor=professor, ano_letivo=ano_letivo).exclude(classe_id=entidade_id).exists():
                return {"status": "error", "message": "Este professor já é Coordenador de outra Classe."}
            
            try:
                classe = Classe.objects.get(id=entidade_id, school=school)
                CoordenadorClasse.objects.update_or_create(
                    classe=classe,
                    school=school,
                    ano_letivo=ano_letivo,
                    defaults={'professor': professor}
                )
                return {"status": "success", "message": f"Professor {professor} atribuído como CC da classe {classe}."}
            except Classe.DoesNotExist:
                return {"status": "error", "message": "Classe não encontrada."}

        elif cargo_tipo == 'DD':
            # Só pode ser DD da disciplina que lecciona
            try:
                disciplina = Disciplina.objects.get(id=entidade_id, school=school)
                if not professor.disciplinas.filter(id=disciplina.id).exists():
                    return {"status": "error", "message": f"O professor não lecciona a disciplina {disciplina.nome}."}
                
                # Um DD só pode ser duma disciplina e uma disciplina só um DD (Exclusividade Mútua)
                if DelegadoDisciplina.objects.filter(professor=professor, ano_letivo=ano_letivo).exclude(disciplina_id=entidade_id).exists():
                    return {"status": "error", "message": "Este professor já é Delegado de outra Disciplina."}

                DelegadoDisciplina.objects.update_or_create(
                    disciplina=disciplina,
                    school=school,
                    ano_letivo=ano_letivo,
                    defaults={'professor': professor}
                )
                return {"status": "success", "message": f"Professor {professor} atribuído como DD da disciplina {disciplina}."}
            except Disciplina.DoesNotExist:
                return {"status": "error", "message": "Disciplina não encontrada."}

        return {"status": "error", "message": "Tipo de cargo inválido."}

    @staticmethod
    def get_estatisticas_alunos(school):
        from .models import Aluno, Classe, Turma
        from django.db.models import Count, Q

        total = Aluno.objects.filter(school=school, ativo=True).count()
        por_sexo = Aluno.objects.filter(school=school, ativo=True).values('sexo').annotate(total=Count('id'))
        por_classe = Aluno.objects.filter(school=school, ativo=True).values('classe_atual__nome').annotate(total=Count('id'))
        por_turma = Aluno.objects.filter(school=school, ativo=True).values('turma_atual__nome', 'classe_atual__nome').annotate(total=Count('id'))

        return {
            "total_alunos": total,
            "por_sexo": list(por_sexo),
            "por_classe": list(por_classe),
            "por_turma": list(por_turma)
        }

    @staticmethod
    def get_estatisticas_disciplinas(school):
        from .models import ProfessorTurmaDisciplina, DelegadoDisciplina
        from salamandra_sge.avaliacoes.models import Nota
        from django.db.models import Avg

        atribuicoes = ProfessorTurmaDisciplina.objects.filter(school=school).select_related('professor__user', 'disciplina', 'turma')
        
        disciplinas_stats = []
        for atri in atribuicoes:
            # Média de aproveitamento (simplificado: média das notas registradas)
            media = Nota.objects.filter(
                school=school, 
                disciplina=atri.disciplina, 
                turma=atri.turma
            ).aggregate(Avg('valor'))['valor__avg'] or 0
            
            # Delegado da disciplina (pode haver um por escola/disciplina)
            delegado = DelegadoDisciplina.objects.filter(
                school=school, 
                disciplina=atri.disciplina
            ).first()

            disciplinas_stats.append({
                "disciplina": atri.disciplina.nome,
                "turma": atri.turma.nome,
                "professor": atri.professor.user.get_full_name(),
                "aproveitamento_medio": float(media),
                "delegado": delegado.professor.user.get_full_name() if delegado else "Não atribuído"
            })

        return disciplinas_stats

    @staticmethod
    def get_estatisticas_aproveitamento(school):
        from .models import Classe, Turma, Aluno
        from salamandra_sge.avaliacoes.models import Nota
        from django.db.models import Avg, Count, Q

        # Regra: Aprovado se média das notas >= 10 (Simplificação para a estatística)
        # Em um sistema real, isso dependeria de ACS, ACP, AT...
        
        classes = Classe.objects.filter(school=school)
        stats_classe = []
        for cl in classes:
            alunos_classe = Aluno.objects.filter(school=school, classe_atual=cl, ativo=True)
            total_alunos = alunos_classe.count()
            
            # Contar alunos com média >= 10 nas disciplinas
            # Aqui vamos simplificar: alunos que têm alguma nota e a média dessas notas é >= 10
            aprovados = 0
            for aluno in alunos_classe:
                media_aluno = Nota.objects.filter(aluno=aluno).aggregate(Avg('valor'))['valor__avg']
                if media_aluno and media_aluno >= 10:
                    aprovados += 1
            
            stats_classe.append({
                "classe": cl.nome,
                "total": total_alunos,
                "aprovados": aprovados,
                "percentagem": (aprovados / total_alunos * 100) if total_alunos > 0 else 0
            })

        turmas = Turma.objects.filter(school=school)
        stats_turma = []
        for tr in turmas:
            alunos_turma = Aluno.objects.filter(school=school, turma_atual=tr, ativo=True)
            total_alunos = alunos_turma.count()
            aprovados = 0
            for aluno in alunos_turma:
                media_aluno = Nota.objects.filter(aluno=aluno).aggregate(Avg('valor'))['valor__avg']
                if media_aluno and media_aluno >= 10:
                    aprovados += 1
            
            stats_turma.append({
                "turma": tr.nome,
                "classe": tr.classe.nome,
                "total": total_alunos,
                "aprovados": aprovados,
                "percentagem": (aprovados / total_alunos * 100) if total_alunos > 0 else 0
            })

        # Média Geral (Aproveitamento Global) - % de alunos com média >= 10
        alunos_ativos = Aluno.objects.filter(school=school, ativo=True)
        total_ativos = alunos_ativos.count()
        aprovados_geral = 0
        for aluno in alunos_ativos:
            media_al = Nota.objects.filter(aluno=aluno).aggregate(Avg('valor'))['valor__avg']
            if media_al and media_al >= 10:
                aprovados_geral += 1
        
        media_geral = (aprovados_geral / total_ativos * 100) if total_ativos > 0 else 0

        return {
            "por_classe": stats_classe,
            "por_turma": stats_turma,
            "media_geral": float(media_geral)
        }
