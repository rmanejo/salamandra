# 🛠️ Administrativo

A app `administrativo` gere o pessoal não docente e os processos administrativos auxiliares da instituição.

## 📋 Funcionalidades Principais

- **Gestão de Funcionários**: Registo de pessoal administrativo, técnico e de apoio.
- **Estrutura de Sectores**: Organização de pessoal por áreas como Secretaria, Recursos Humanos e Apoio Administrativo.
- **Carreira Técnica**: Controlo de anos de serviço e tipo de provimento (Provisório/Definitivo).
- **Integração de Gestão**: Inclui obrigatoriamente o Chefe da Secretaria e o Director da Escola (em colaboração com a app `core`).

## 🗄️ Modelos Relevantes

### 👷 Pessoal Não Docente
- `Funcionario`: Perfil do funcionário vinculado ao utilizador e escola. Contém o cargo específico e o sector de actuação.

## ⚙️ Regras de Negócio

1. **Responsabilidade de Registo**: O pessoal administrativo (Chefe da Secretaria) é responsável pelo registo de todos os funcionários e professores da escola no sistema.
2. **Isolamento**: Todos os funcionários estão estritamente vinculados a uma `School`.
3. **Cargos Iniciais**: A escola deve iniciar obrigatoriamente com o cargo de Chefe da Secretaria e o Director da Escola já registados como funcionários para permitir o funcionamento imediato dos processos administrativos.

## 📁 Estrutura de Arquivos

- `admin.py`: Interface de gestão para os funcionários no Django Admin.
- `apps.py`: Configuração da app administrativa.
- `models.py`: Define o modelo `Funcionario` e o modelo de `AvaliacaoDesempenho` para o pessoal administrativo.
- `serializers.py`: Converte os dados do pessoal não docente para consumo na API.
- `tests_administrativo.py`: Garante que as regras de matrícula e registo de faltas/avaliações administrativas estão corretas.
- `urls.py`: Define os caminhos de rede para o módulo administrativo.
- `views.py`: Implementa a lógica de visualização e edição de funcionários e avaliações.
