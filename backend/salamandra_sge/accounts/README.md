# Aplicação de Contas e Autenticação (`accounts`)

Esta aplicação é responsável por gerir o acesso ao sistema SalamandraSGE. Ela foca-se exclusivamente na lógica de autenticação e controle de permissões, delegando a identidade do utilizador para o modelo `core.CustomUser`.

## 📂 Estrutura e Funcionalidades

### 1. Autenticação (`views.py` & `urls.py`)
O sistema utiliza os seguintes endpoints para gestão de sessão:
- **`POST /api/accounts/login/`**: Autentica um utilizador usando `email` e `password`. Em caso de sucesso, inicia a sessão e retorna os dados do utilizador.
- **`POST /api/accounts/logout/`**: Termina a sessão do utilizador.
- **`GET /api/accounts/me/`**: Retorna os detalhes do utilizador autenticado no momento.

### 2. Perfis e Serialização (`serializers.py`)
Utilizamos o `UserSerializer` para converter o modelo `CustomUser` em JSON:
- Inclui campos como `email`, `first_name`, `last_name` e `role`.
- **`role_display`**: Um campo de leitura que retorna o nome legível do cargo (ex: "Director Adjunto Pedagógico" em vez de "DAP").

### 3. Controle de Acesso por Cargo (`permissions.py`)
Implementamos permissões granulares para garantir que apenas utilizadores autorizados acedam a certas funcionalidades:
- **`IsAdminSistema`**: Acesso total para administradores de TI.
- **`IsAdminEscola`**: Permissões para o Director da Escola.
- **`IsDAP`**: Permissões específicas para a área pedagógica.
- **`IsProfessor`**: Acesso restrito às pautas e turmas atribuídas.
- **`IsAdministrativo`**: Acesso a tarefas de secretaria.

### 4. Administração (`admin.py`)
O modelo `CustomUser` é registado aqui para permitir a gestão de utilizadores através do Painel de Administração do Django.

---

## 📌 Notas de Desenvolvimento

- **Modelo de Utilizador**: Esta aplicação NÃO define modelos. Ela consome o `CustomUser` definido em `core/models.py`.
- **Segurança**: Quase todas as views (exceto login) exigem que o utilizador esteja autenticado (`IsAuthenticated`).
- **Isolamento**: O campo `school` no utilizador é fundamental para garantir que ele só veja dados da sua própria instituição.

## 📁 Estrutura de Arquivos

- `admin.py`: Registo do utilizador no Django Admin.
- `apps.py`: Configuração da app de contas.
- `models.py`: Arquivo minimalista (a identidade real está em `core.models.py`).
- `permissions.py`: **O arquivo mais importante para segurança.** Contém as classes que decidem quem pode ver ou editar o quê com base no cargo.
- `serializers.py`: Transforma os dados do utilizador para intercâmbio via API.
- `tests.py`: Garante que o sistema de login e as travas de segurança estão a funcionar.
- `urls.py`: Define os caminhos de rede para o sistema de contas.
- `views.py`: Lógica principal para processar logins e retornos de perfil de utilizador.
