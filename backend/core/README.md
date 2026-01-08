# Aplicação Base (`core`)

A aplicação `core` é a base fundamental de todo o ecossistema SalamandraSGE. Ela define as entidades universais que são partilhadas por todos os outros módulos (Académico, Administrativo, etc.).

## 🎯 Objetivo
Esta app resolve a identidade (Quem? - `CustomUser`) e a localização institucional (Onde? - `District` e `School`). Ela não contém lógica de negócio específica (pedagógica ou financeira), servindo apenas como o "esqueleto" do sistema.

## 🏗️ Modelos Principais

### 1. `District` (Distrito)
Representa a divisão geográfica administrativa.
- É a entidade de topo na hierarquia de localização.
- Agrupa várias escolas.

### 2. `School` (Escola)
Representa a instituição de ensino.
- **Isolamento**: É a chave para a multi-tenancy. Quase todos os dados do sistema (alunos, notas, turmas) estão vinculados a uma `School`.
- **Tipos de Escola**:
    - `PRIMARIA`: Ensino Primário (1ª - 6ª Classe).
    - `SECUNDARIA_1`: Secundário 1º Ciclo (7ª - 9ª Classe).
    - `SECUNDARIA_2`: Secundário 2º Ciclo (10ª - 12ª Classe).
    - `SECUNDARIA_COMPLETA`: Secundário I e II Ciclo (7ª - 12ª Classe).
- **Campo `blocked`**: Permite suspender o acesso de uma instituição inteira ao sistema.

### 3. `CustomUser` (Utilizador)
Substitui o utilizador padrão do Django para suportar a lógica de Moçambique:
- **Identificador**: Utiliza o `email` para login em vez de `username`.
- **Criação**: Gerido por `CustomUserManager`.
- **Vinculação**: Cada utilizador pode estar vinculado a um `District` e/ou uma `School`.

## 🔐 Hierarquia de Cargos (`ROLE_CHOICES`)

O sistema opera num modelo de permissões baseado em cargos:

| Cargo | Nível | Descrição |
| :--- | :--- | :--- |
| `ADMIN_SISTEMA` | 0 | Administrador Central. Gere distritos e utilizadores SDEJT. |
| `SDEJT_RAP` | 1 | Distrito (Adm e Planificação). Cria escolas e gestores escolares. |
| `SDEJT_REG` | 1 | Distrito (Ensino Geral). Supervisão pedagógica distrital. |
| `ADMIN_ESCOLA` | 2 | Director da Escola. Responsável máximo pela instituição. |
| `DAP` | 2 | Director Adjunto Pedagógico. Gere o coração académico da escola. |
| `PROFESSOR` | 3 | Docente. Lança notas e gere as suas turmas. |
| `ADMINISTRATIVO` | 3 | Secretaria. Gere matrículas e dados administrativos. |

---

## 🛠️ Administração (`admin.py`)
A gestão destas entidades fundamentais é feita através do painel administrativo central, onde o `CustomUserAdmin` foi otimizado para permitir filtros por cargo e estado de atividade.

## 📁 Estrutura de Arquivos

- `admin.py`: Configura a interface administrativa do Django para os modelos base, garantindo que `CustomUser`, `School` e `District` possam ser geridos centralmente.
- `apps.py`: Contém a configuração da aplicação Django `core`.
- `models.py`: **O arquivo mais crítico.** Define `District`, `School` e `CustomUser`, que formam a espinha dorsal de todo o sistema.
- `tests.py`: Garante a integridade dos modelos base e da lógica de autenticação inicial.
- `views.py`: Contém visualizações de sistema ou utilitários globais.

## 📌 Regra de Ouro da Arquitetura
**Nenhuma lógica pedagógica ou administrativa pesada deve ser adicionada aqui.** Esta app deve permanecer "leve" para garantir que o núcleo do sistema seja estável e fácil de manter.
