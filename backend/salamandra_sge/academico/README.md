# 🎓 Académico

A app `academico` é o coração pedagógico do SalamandraSGE. Ela gere todos os processos relacionados com a vida escolar dos alunos e a actividade docente dos professores.

## 📋 Funcionalidades Principais

- **Gestão de Alunos**: Registo completo de matrícula incluindo dados pessoais (Sexo, Nascimento), filiação, encarregado de educação e situação social (vulnerabilidade).
- **Estrutura Pedagógica**: Definição de Classes, Disciplinas e Turmas por Ano Lectivo.
- **Formação Automática de Turmas**: Algoritmo para distribuição equilibrada de alunos por idade (mais novos primeiro) respeitando limites de lotação.
- **Carreira Docente**: Gestão de professores com dados de formação (N4 a N1) e áreas de especialidade.
- **Atribuição Pedagógica**: Vinculação de professores a turmas e disciplinas específicas.
- **Responsabilidades Específicas**: Atribuição de cargos de Director de Turma (DT), Coordenador de Classe (CC) e Delegado de Disciplina (DD).

## 🗄️ Modelos Relevantes

### 👨‍🏫 Docentes e Alunos
- `Professor`: Perfis docentes vinculados ao utilizador e escola. Contém anos de serviço e formação.
- `Aluno`: Dados dos alunos matriculados. O campo `ativo` permite gerir desistências sem perder o histórico.

### 🏫 Organização Escolar
- `Classe`: Níveis de ensino (ex: 10ª Classe).
- `Disciplina`: Matérias leccionadas (ex: Matemática).
- `Turma`: Agrupamento de alunos em classes específicas por ano lectivo.

### 🔑 Responsabilidades (Atribuídas pelo DAP)
- `DirectorTurma`: Vincula um professor a uma turma específica.
- `CoordenadorClasse`: Supervisão pedagógica por nível de ensino.
- `DelegadoDisciplina`: Gestão pedagógica por matéria.
- `ProfessorTurmaDisciplina`: O mapa de quem ensina o quê em cada turma.

## ⚙️ Regras de Negócio

1. **Seeding de Disciplinas (Primária)**: A secretaria pode usar o endpoint de seeding para criar automaticamente as disciplinas do currículo nacional para escolas primárias. 
   - 1ª a 3ª: Português, Matemática e Ed. Física.
   - 4ª a 6ª: Adição de Ciências Naturais, Sociais e EV/Ofícios.
2. **Formação de Turmas**: No momento da inscrição, o aluno é vinculado obrigatoriamente a uma `Classe` (Lista de Classe). Posteriormente, o sector administrativo ou pedagógico pode alocar o aluno a uma `Turma` específica preenchendo o campo `turma_atual`.
3. **Isolamento de Dados**: Todos os modelos possuem uma `ForeignKey` para `School`, garantindo que os dados de uma escola nunca se misturem com outra.
4. **Preservação de Dados**: Alunos e professores nunca são apagados, apenas desactivados, para manter a integridade dos registos históricos da escola.
5. **Formação N2/N1**: Professores nestes níveis de formação devem obrigatoriamente ter a sua `area_formacao` preenchida.

## 📁 Estrutura de Arquivos

- `academic_role_service.py`: Centraliza o cálculo de estatísticas complexas para os cargos de Director de Turma, Coordenador de Classe e Delegado de Disciplina.
- `admin.py`: Registo dos modelos pedagógicos no Django Admin.
- `apps.py`: Configuração da app académica.
- `models.py`: Define a infraestrutura pedagógica (`Aluno`, `Professor`, `Turma`, `Classe`, `Disciplina`, etc.).
- `serializers.py`: Converte os modelos académicos para JSON para consumo pela API.
- `services.py`: Contém a lógica de negócio pesada, como a distribuição automática de alunos por turmas e o seeding de disciplinas.
- `tests_academic_roles.py`: Testes específicos para as permissões e dashboards dos cargos DT, CC e DD.
- `tests_dae.py`: Testes focados nas funcionalidades do Director Adjunto de Escola.
- `urls.py`: Define os endpoints da API para o módulo académico.
- `views.py`: Implementa os `ViewSet`s que processam as requisições da API.
