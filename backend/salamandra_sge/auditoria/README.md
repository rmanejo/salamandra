# 🔍 Auditoria

A app `auditoria` é responsável pela transparência e segurança do sistema, registando eventos críticos e acções dos utilizadores.

## 📋 Funcionalidades Principais (Em Desenvolvimento)

- **Logs de Acesso**: Registo de logins e tentativas falhadas.
- **Rasto de Alterações**: Monitorização de mudanças em dados sensíveis (notas, transferências de alunos, criação de escolas).
- **Transparência Total**: Camada de auditoria para garantir que toda acção administrativa possui um responsável identificado.

## ⚙️ Regras de Negócio

1. **Imutabilidade**: Os logs de auditoria nunca devem ser apagados ou editados.
2. **Independência**: A recolha de logs deve ser automática sempre que possível, sem depender da acção manual do utilizador.

## 📁 Estrutura de Arquivos

- `admin.py`: Permite a visualização de logs históricos através do Django Admin.
- `apps.py`: Configuração da app de auditoria.
- `models.py`: Define a estrutura dos logs de sistema.
- `tests.py`: Testes unitários para o sistema de logs.
- `views.py`: ViewSets para consulta de logs (acesso geralmente restrito a Admin de Sistema).
