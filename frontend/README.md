# SalamandraSGE - Frontend Documentation

Este documento detalha as funcionalidades implementadas no frontend do SalamandraSGE e uma visão geral técnica de como foram construídas.

## 🏗 Estrutura e Tecnologias
- **Framework**: React com TypeScript.
- **Estilização**: Bootstrap 5 (React-Bootstrap) + CSS Personalizado (`App.css`).
- **Comunicação API**: Axios (`services/api.ts`).
- **Navegação**: React Router DOM.
- **Gestão de Estado**: Hooks do React (`useState`, `useEffect`).

---

## 🔐 Autenticação e Segurança

### Funcionalidades
1.  **Login Unificado**: Redirecionamento automático baseado no perfil do utilizador (Director, DAP, Administrativo, Professor).
2.  **Autenticação Secundária**: Para acções sensíveis (ex: remover aluno, ver dados financeiros), é solicitada a senha novamente.
3.  **Proteção de Rotas**: `ProtectedRoute` garante que apenas utilizadores autenticados acedam ao sistema.

### Implementação
- **Componentes**: `Login.tsx`, `VerifyPasswordModal.tsx`.
- **Serviço**: `authService.login`, `authService.verifyPassword`.
- **Fluxo**: O token JWT é armazenado no `localStorage`. Interceptores do Axios anexam o token a cada requisição.

---

## 👥 Gestão de Recursos Humanos (Staff)

### 1. Gestão de Funcionários (GRH)
Utilizado pelo perfil **Administrativo** e **Direcção**.

**Funcionalidades:**
- **Listagem Geral**: Visualização de todos os funcionários (Docentes e Não Docentes).
- **Registo Unificado**: O formulário adapta-se para registar "Docentes" (com disciplinas) ou "Técnicos".
- **Visualização de Sectores**: Mapeamento amigável de códigos (ex: `DIRECAO` -> "Direção/Gestão", `PEDAGOGICO` -> "Pedagógico").
- **Edição e Remoção**:
  - Botão "Editar" permite alterar dados pessoais e profissionais.
  - **Proteção**: Botões de acção são ocultados para membros da Direcção (`ADMIN_ESCOLA`, `DAP`, `DAE`) e Secretaria para evitar remoção acidental de administradores.

**Implementação:**
- **Página**: `GestaoFuncionarios.tsx`.
- **API**: `administrativeService` (`getStaffMembers`, `registerStaff`, `updateStaff`, `deleteStaff`).
- **Lógica**: Utiliza `editingId` para alternar entre modo de criação e edição no modal.

### 2. Gestão de Cargos Pedagógicos
Utilizado pelo **DAE** (Director Adjunto de Escola) e **DAP**.

**Funcionalidades:**
- **Atribuição de Cargos**:
  - **DT (Director de Turma)**: Um por turma.
  - **CC (Coordenador de Classe)**: Um por classe.
  - **DD (Delegado de Disciplina)**: Um por disciplina. Regra estrita: professor só pode ser DD de uma disciplina que lecciona.
- **Visualização**:
  - Coluna "Disciplinas" mostra as cadeiras atribuídas ao professor.
  - Nome do professor exibe cargos activos: `João da Silva (DT/DD)`.

**Implementação:**
- **Página**: `GestaoCargosProfessores.tsx`.
- **API**: `daeService.atribuirCargo`.
- **Validação**: O backend retorna erros 400 se as regras de exclusividade forem violadas, que são exibidos em Alertas no topo da página.

---

## 🎓 Gestão Académica (Alunos e Turmas)

### 1. Gestão de Alunos
**Funcionalidades:**
- **Matrícula**: Processo em 2 passos (Dados Pessoais -> Dados Académicos).
- **Transferências**: Mudança de escola (gera guia de transferência).
- **Movimentações**: Mudança interna de turma.
- **Histórico**: Visualização de notas por trimestre e disciplina.

**Implementação:**
- **Página**: `GestaoAlunos.tsx`.
- **Componentes**: `StudentList`, `StudentForm` (modal), `AcademicStatusView`.
- **API**: `academicService`.

### 2. Gestão de Turmas
**Funcionalidades:**
- **Formação Automática**: Algoritmo que distribui alunos matriculados em turmas baseadas na capacidade das salas.
- **Listagem**: Visualização por classe e ano lectivo.

**Implementação:**
- **Página**: `GestaoTurmas.tsx`.
- **API**: `academicService.autoFormarTurmas`.

---

## 📊 Dashboards

O sistema possui dashboards específicos para cada perfil:
- **DirectorDashboard**: Visão global, estatísticas financeiras e de aproveitamento.
- **DapDashboard**: Foco pedagógico, aproveitamento por disciplina e classe.
- **AdministrativeDashboard**: Foco em RH e Secretaria.

**Implementação:**
- Ficheiro `GenericDashboard.tsx` actua como roteador, renderizando o dashboard correcto baseado na `role` do utilizador.

---

## 🛠 Serviços API (`api.ts`)

A comunicação com o backend Django é centralizada em objectos de serviço:
- `authService`: Autenticação.
- `academicService`: Alunos, Turmas, Professores.
- `administrativeService`: Funcionários, Disciplinas (CRUD).
- `daeService`: Funções específicas da Direcção Pedagógica (Cargos).

---

## 🚀 Como Executar

```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento
npm run dev
```

O frontend roda na porta **5173** por padrão e conecta-se ao backend na porta **8000**.
