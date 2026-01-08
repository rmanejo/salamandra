# 🚀 Documentação da API - SalamandraSGE

Esta documentação detalha os endpoints do sistema para consumo pelo Frontend.

---

## 🔐 1. Autenticação (`accounts`)

Base URL: `/api/accounts/`

### 1.1 Login
- **URL**: `/api/accounts/login/`
- **Método**: `POST`
- **Payload**:
  ```json
  {
    "email": "user@escola.com",
    "password": "password123"
  }
  ```
- **Resposta (200 OK)**:
  ```json
  {
    "id": 1,
    "email": "user@escola.com",
    "role": "ADMIN_ESCOLA",
    "role_display": "Director da Escola",
    "school_name": "Moçambique Central"
  }
  ```

### 1.2 Perfil Atual (Me)
- **URL**: `/api/accounts/me/`
- **Método**: `GET`
- **Resposta (200 OK)**: Dados do utilizador logado.

---

## 🏫 2. Gestão Institucional (`instituicoes`)

### 2.1 Bloqueio da Escola
- **URL**: `/api/instituicoes/director/bloquear_escola/`
- **Método**: `POST`
- **Payload**: `{"bloquear": true}` (ou `false` para desbloquear)
- **Notas**: Somente `ADMIN_ESCOLA` ou `ADMIN_SISTEMA`.

### 2.2 Dashboard do Director
- **URL**: `/api/instituicoes/director/dashboard/`
- **Método**: `GET`
- **Resposta**: Totais de alunos, docentes, técnicos e aproveitamento pedagógico por classe/disciplina.

---

## 🎓 3. Módulo Académico (`academico`)

### 3.1 Alunos
- **GET `/api/academico/alunos/`**: Lista alunos. Filtros: `classe_id`, `turma_id`.
- **POST `/api/academico/alunos/`**: Inscreve aluno.
  ```json
  {
    "nome_completo": "João Exemplo",
    "sexo": "HOMEM",
    "data_nascimento": "2010-05-15",
    "classe_atual": 1
  }
  ```
- **POST `/api/academico/alunos/{id}/mover_turma/`**:
  ```json
  { "nova_turma_id": 5 }
  ```

### 3.2 Cargos de Confiança (DAE Actions)
- **POST `/api/academico/dae/atribuir_cargo/`**:
  ```json
  {
    "professor_id": 1,
    "cargo_tipo": "DT", 
    "entidade_id": 10,
    "ano_letivo": 2026
  }
  ```

### 3.3 Director de Turma (DT)
- **GET `/api/academico/director-turma/minha_turma/`**: Resumo estatístico da turma do professor logado.
- **GET `/api/academico/director-turma/alunos/`**: Lista simplificada dos alunos da sua turma.

### 3.4 Coordenador de Classe (CC)
- **GET `/api/academico/coordenador-classe/resumo_classe/`**: Status de aproveitamento das turmas que coordena.

---

## 📝 4. Avaliações e Notas (`avaliacoes`)

### 4.1 Lançamento de Notas
- **URL**: `/api/avaliacoes/notas/`
- **Método**: `POST`
- **Payload**:
  ```json
  {
    "aluno": 45,
    "turma": 10,
    "disciplina": 5,
    "trimestre": 1,
    "tipo": "ACS",
    "valor": 14.50
  }
  ```
  - `tipo`: `ACS` (Contínua), `MAP` (Prática), `ACP` (Parcial/Final Trimestre).

### 4.2 Lançamento de Faltas
- **URL**: `/api/avaliacoes/faltas/`
- **Método**: `POST`
- **Payload**:
  ```json
  {
    "aluno": 45,
    "turma": 10,
    "disciplina": 5,
    "data": "2026-03-20",
    "tipo": "INJUSTIFICADA"
  }
  ```

---

## 📊 5. Relatórios e Pautas

### 5.1 Pauta Trimestral Detalhada
- **URL**: `/api/academico/relatorios/pauta_turma/`
- **Método**: `GET`
- **Query Params**: `turma_id`, `disciplina_id` (Obrigatórios)
- **Resposta (Exemplo de estrutura)**:
  ```json
  {
    "turma": "10ª A",
    "disciplina": "Matemática",
    "pauta": [
      {
        "nome": "Abílio João",
        "trimesters": {
          "1": {
            "acs": [10.0, 9.0],
            "map": 12.0,
            "macs": 10.33,
            "acp": 9.0,
            "mt": 9.8,
            "com": "S"
          }
        },
        "mfd": 10.5
      }
    ]
  }
  ```

---

## 🛠️ 6. Administrativo (`administrativo`)

- **GET `/api/administrativo/funcionarios/`**: Lista pessoal não docente.
- **POST `/api/administrativo/avaliacoes-desempenho/`**:
  ```json
  {
    "funcionario": 12,
    "periodo": "2026-Q1",
    "pontuacao": 85,
    "comentarios": "Excelente desempenho na secretaria."
  }
  ```
