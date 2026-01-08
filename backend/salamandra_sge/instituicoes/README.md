# 🏫 Instituições

A app `instituicoes` gere os metadados e detalhes operacionais das escolas que estão registadas no núcleo (`core`) do sistema.

## 📋 Funcionalidades Principais

- **Criação de Escolas**: Implementa o fluxo de criação de escolas pelo SDEJT (Nível 1).
- **Iniciação de Pessoal**: Gera automaticamente os utilizadores e perfis para o Director, DAP e Chefe da Secretaria no momento da abertura da escola.
- **Detalhes Operacionais**: Registo de endereços, contactos e infraestrutura.
- **Níveis de Ensino**: Especificação se a escola oferece ensino primário, secundário geral ou técnico.

## 🗄️ Modelos Relevantes

### 🏢 Metadados
- `DetalheEscola`: Extensão do modelo `School` (do `core`) que armazena informações de contacto e logística.

## ⚙️ Regras de Negócio

1. **Criação Atómica**: A criação de uma escola pelo SDEJT é atómica; se a criação dos utilizadores gestores falhar, a escola não é criada.
2. **Director como Professor**: O sistema permite a flexibilidade de registar o Director da Escola também como Professor (`admin_is_teacher`).
3. **Validação de Email**: Antes de criar uma escola, o sistema garante que nenhum dos emails dos gestores fornecidos já está em uso na plataforma.

## 📁 Estrutura de Arquivos

- `admin.py`: Gestão administrativa de dados logísticos das escolas.
- `apps.py`: Configuração da app de instituições.
- `models.py`: Define o modelo `DetalheEscola` (morada, contactos e infraestrutura).
- `serializers.py`: Serializadores para detalhes institucionais e resumo escolar.
- `tests_director.py`: Garante que as funções de Director (Bloqueio de Escola/Dashboard) estão seguras.
- `urls.py`: Define os endpoints do módulo institucional.
- `views.py`: Implementa o `DirectorViewSet` para gestão global da escola e estatísticas.
