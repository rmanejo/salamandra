# Referência Completa da API SalamandraSGE

Este documento serve como guia definitivo para todos os endpoints da API, organizados por módulo funcional.

---

## 🔑 1. Autenticação e Perfil (`api/accounts/`)

| Endpoint | Método | Descrição | Payload (POST) |
| :--- | :--- | :--- | :--- |
| `/login/` | POST | Iniciar sessão | `{"email": "...", "password": "..."}` |
| `/logout/` | POST | Terminar sessão | - |
| `/me/` | GET | Dados do utilizador logado | - |
| `/csrf-token/` | GET | Obter token de segurança | - |

---

## 🏫 2. Gestão Institucional (`api/instituicoes/`)

### 🚩 Escolas (SDEJT)
| Endpoint | Método | Descrição | Payload / Parâmetros |
| :--- | :--- | :--- | :--- |
| `/escolas/` | GET | Listar escolas (filtra por distrito) | - |
| `/escolas/` | POST | **Setup de Escola**: Cria escola + 3 Gestores | See "Setup de Escola" below |

**Setup de Escola (POST):**
```json
{
  "name": "Nome da Escola",
  "district": ID_DISTRITO,
  "school_type": "SECUNDARIA_COMPLETA",
  "admin_escola_email": "director@...",
  "admin_escola_password": "...",
  "dap_email": "dap@...",
  "dap_password": "...",
  "adm_sector_email": "secretaria@...",
  "adm_sector_password": "...",
  "admin_is_teacher": false
}
```

### 📈 Gestão da Direcção
| Endpoint | Método | Descrição |
| :--- | :--- | :--- |
| `/director/dashboard/` | GET | **Estatísticas Gerais**: Total de Profs, Alunos, Técnicos e Médias. |
| `/director/bloquear_escola/` | POST | Bloqueia/Desbloqueia o acesso à escola (Freeze de dados). |

---

## 🎓 3. Módulo Académico (`api/academico/`)

### 👥 Alunos
| Endpoint | Método | Descrição |
| :--- | :--- | :--- |
| `/alunos/` | GET | Listar alunos da escola. |
| `/alunos/` | POST | **Inscrição**: `{"nome_completo": "...", "data_nascimento": "YYYY-MM-DD", "classe_atual": ID}` |
| `/alunos/{id}/transferir/` | POST | Marcar como transferido (Inativo). |
| `/alunos/{id}/mover_turma/` | POST | Mover para nova turma: `{"nova_turma_id": ID}` |

### 👨‍🏫 Professores e Cargos
| Endpoint | Método | Descrição |
| :--- | :--- | :--- |
| `/professores/` | GET | Listar todos os docentes da escola. |
| `/professores/{id}/` | PATCH | Atualizar formação: `{"formacao": "N1", "area_formacao": "..."}` |
| `/dae/atribuir_cargo/` | POST | Atribui cargo (DT, CC, DD): `{"professor_id": ID, "cargo_tipo": "DT", "entidade_id": ID_TURMA_OU_CLASSE}` |

### 📂 Turmas e Disciplinas
| Endpoint | Método | Descrição |
| :--- | :--- | :--- |
| `/turmas/` | GET | Listar turmas. |
| `/turmas/formar_turmas/` | POST | **Automatização**: Cria turmas baseado no rácio alunos/sala. |
| `/disciplinas/` | GET | Listar disciplinas. |
| `/disciplinas/seed_primaria/`| POST | Populador automático do currículo primário. |
| `/disciplinas/seed_secundaria/`| POST | Populador automático do currículo secundário. |

---

## 👔 4. Gestão de Staff e Atribuição (`api/administrativo/`)

### 🔄 Registo de Pessoal
Para adicionar novos membros (**DAE** ou **Professores**) após o setup da escola:

**POST `/api/administrativo/funcionarios/registar/`**
```json
{
  "email": "email@...",
  "password": "...",
  "first_name": "...",
  "last_name": "...",
  "role": "PROFESSOR",
  "cargo": "Professor Titular",
  "sector": "APOIO",
  "is_teacher": true,
  "formacao": "N1"
}
```

---

## 📊 5. Relatórios e Avaliações

### 📝 Avaliações (`api/avaliacoes/`)
| Endpoint | Método | Payload |
| :--- | :--- | :--- |
| `/notas/` | POST | `{"aluno": ID, "disciplina": ID, "valor": 15}` |
| `/faltas/` | POST | `{"aluno": ID, "data": "YYYY-MM-DD", "justificada": false}` |

### 📑 Relatórios Estruturados (`api/academico/relatorios/`)
| Endpoint | Método | Descrição |
| :--- | :--- | :--- |
| `/resumo_escola/` | GET | Resumo simplificado para dashboards do DAP/DAE. |
| `/pauta_turma/` | GET | Gera os dados da pauta de frequência filtrada por turma. |
| `/dae/estatisticas_alunos/` | GET | Distribuição por Sexo, Órfãos e Classes. |
