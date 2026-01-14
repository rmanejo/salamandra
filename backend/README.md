# SalamandraSGE - Sistema de Gestão Escolar

Este projeto é um Sistema de Gestão Escolar (SGE) desenvolvido em Django, focado na modernização e simplificação dos processos educativos em Moçambique.

## 🏗️ Estrutura do Projeto e Regras de Arquitetura

O projeto segue uma estrutura modular rigorosa para garantir escalabilidade e isolamento de dados.

### 📌 Regra de Ouro: Isolamento por Escola
**Quase TODOS os modelos (Alunos, Professores, Turmas, Disciplinas, etc.) devem obrigatoriamente ter um campo `school`.**
```python
school = models.ForeignKey(School, on_delete=models.CASCADE)
```
Isto garante multi-escola real, segurança de dados e bloqueio por instituição.

---

## 🔝 Filtros de Gestão e Hierarquia

### 🔒 Nível 0: Admin do Sistema (`ADMIN_SISTEMA`)
- Criação de **Distritos**.
- Criação de utilizadores **SDEJT** (Nível 1).
- Ativação/Desativação de Distritos e Escolas.

### 🔒 Nível 1: Distrito (`SDEJT_RAP`, `SDEJT_REG`)
- Criação de **Escolas** (apenas no seu distrito).
- **Regra de Ouro:** Ao criar uma escola, o SDEJT regista obrigatoriamente: **Director da Escola**, **DAE (Director Adjunto de Escola)** e **Chefe da Secretaria** (Administrativo). Estes perfis são criados automaticamente nas listas de funcionários.
### 6. Professor (`PROFESSOR`)
- Lançamento de notas e faltas das suas turmas.
- Visualização de estatísticas de aproveitamento por turma.

#### Cargos de Confiança (Docentes):
- **Director de Turma (DT)**: Gere a lista da turma, pautas, faltas e estatísticas de aprovados/reprovados por sexo.
- **Coordenador de Classe (CC)**: Forma turmas, inscreve alunos e monitora o aproveitamento global da classe.
- **Delegado de Disciplina (DD)**: Monitora o aproveitamento global da disciplina por professor e turma.
- **DAE vs DAP:** O **DAE** é o responsável pela gestão pedagógica direta (atribuição de cargos, estatísticas), enquanto o **DAP** foca-se na supervisão pedagógica geral.
- **Ciclos de Ensino:** 
  - **Primária:** 1ª a 6ª Classe.
  - **Secundária I:** 7ª a 9ª Classe.
  - **Secundária II:** 10ª a 12ª Classe.
- **Isolamento:** Só vê dados geográficos e escolares do seu próprio distrito.

---

## 🚀 Divisão de Responsabilidades

### 1. Core (`core/`) - Entidades Universais
Contém apenas o que é global e essencial:
- `CustomUser`: Apenas acesso (login) e `role` (cargo).
- `District` e `School`: Identidade básica geográfica e institucional.
- **Regra:** Nada pedagógico entra aqui.

### 2. Contas (`salamandra_sge/accounts/`)
Responsável apenas por:
- Lógica de autenticação (JWT/Session).
- Gestão de permissões.
- **Regra:** Não armazena dados profissionais (ex: currículo de professor).

### 3. Académico (`salamandra_sge/academico/`) - O Coração
Contém as funções reais e pedagógicas:
- **Professor**: Referencia `User` e `School`.
- **Gestão de Responsabilidades (Atribuídas pelo DAE)**:
  - **DT (Director de Turma)**: Responsável por uma turma específica.
  - **CC (Coordenador de Classe)**: Responsável por um nível de ensino.
  - **DD (Delegado de Disciplina)**: Responsável por uma matéria.
- **Aluno**: Com campo `ativo=True`.
- **Classe, Turma, Disciplina**.
- **ProfessorTurmaDisciplina**: O modelo de atribuição pedagógica.

### 4. Instituições (`salamandra_sge/instituicoes/`)
Gere os detalhes operacionais das escolas (identificadas no `core`):
- Endereço, contactos.
- Níveis de ensino, turnos.
- Infraestrutura.

### 5. Avaliações (`salamandra_sge/avaliacoes/`)
**Apenas avaliam.** Consomem dados do `academico`:
- Caderneta, Notas, Médias.
- Boletins e Estatísticas de rendimento.
- **Regra:** Não criam alunos nem turmas.

### 6. Administrativo (`salamandra_sge/administrativo/`)
- **Gestão de Alunos**: Inscrição, transferência entre escolas e mudança de turma.
- **Gestão de Funcionários**: Registo de pessoal não docente e histórico de **Avaliação de Desempenho**.
- **Secretaria**: Emissão de pautas e relatórios estatísticos.

### 7. Auditoria (`salamandra_sge/auditoria/`)
- Registo de logs críticos para transparência total.

---

## 🔑 Lógica de Cadastro de Funcionários

Ao cadastrar um funcionário, o sistema obriga à distinção entre **Docente** e **Técnico**:

### 👨‍🏫 Carreira Docente (App `academico`)
- **Dados**: Anos de serviço, Tipo de provimento (Provisório/Definitivo), Formação Pedagógica (N4 a N1).
- **Nota**: Se formação for **N2 ou N1**, deve-se especificar a **Área de Formação**.
- **Alocação**:
  - **Escola Secundária**: Vinculado obrigatoriamente às **Disciplinas** que lecciona.
  - **Escola Primária**: Vinculado às **Classes** que lecciona.

### 🛠️ Carreira Técnica/Administrativa (App `administrativo`)
- **Dados**: Anos de serviço, Tipo de provimento.
- **Vínculo**: Direcionado para sectores específicos (**Secretaria, RH ou Apoio**).

---

## 🛠️ Estrutura de Diretórios

```text
SalamandraSGE/
├── manage.py
├── core/                  # CustomUser, School, District
├── salamandra_sge/
│   ├── settings.py
│   ├── accounts/          # Autenticação e Acesso
│   ├── instituicoes/      # Metadados das Escolas
│   ├── academico/         # Alunos, Professores, Turmas (Coração)
│   ├── avaliacoes/        # Notas e Pautas
│   ├── administrativo/    # RH e Secretaria
│   └── auditoria/         # Logs
```

## 🛠️ Como Iniciar

1. **Ativar o Ambiente Virtual:**
   ```bash
   source venv/bin/activate
   ```

2. **Instalar Dependências:**
   ```bash
   pip install django djangorestframework
   ```

3. **Executar Migrações:**
   ```bash
   python manage.py migrate
   ```

---

## 🐳 Executando com Docker (PostgreSQL, Redis, Celery)

O projeto utiliza **Docker Compose Profiles** para separar os serviços de desenvolvimento.

### 1. Configuração Inicial
```bash
cp .env.example .env
# Edite o .env se necessário
```

### 2. Iniciar Ambiente de Desenvolvimento
Este comando inicia o Django, Postgres, Redis, Celery Worker e pgAdmin:
```bash
cd backend
docker compose --profile development down

docker compose --profile development up -d --build

docker compose --profile development up -d salamandra_develop
docker compose --profile development logs -f salamandra_develop

```

### 3. Acessar os Serviços
- **API (Django)**: [http://localhost:8000](http://localhost:8000)
- **pgAdmin**: [http://localhost:5050](http://localhost:5050) (Login no .env)

### 4. Comandos de Desenvolvimento Úteis
```bash
# Ver logs de todos os serviços
docker compose --profile development logs -f

# Criar migrações
docker compose --profile development exec develop python manage.py makemigrations

# Aplicar migrações
docker compose --profile development exec develop python manage.py migrate

# Executar testes
docker compose --profile development exec develop python manage.py test

# Criar Superusuário
docker compose --profile development exec develop python manage.py createsuperuser
```

---

---
**Documentação em Português (Moçambique)**
