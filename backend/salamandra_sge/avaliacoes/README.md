# 📝 Avaliações

A app `avaliacoes` gere o registo de desempenho académico dos alunos, focando-se meramente na componente de avaliação (notas e pautas).

## 📋 Funcionalidades Principais

- **Registo de Notas**: Lançamento de avaliações quantitativas (0 a 20 valores).
- **Tipos de Avaliação**: Suporte para ACS, ACP, AT e Exames Finais.
- **Histórico de Rendimento**: Rastreio de notas por aluno, disciplina e turma.

## 🗄️ Modelos Relevantes

### 📊 Avaliações
- `Nota`: Representa um valor numérico atribuído a um aluno numa disciplina e turma específicas.

## ⚙️ Regras de Negócio

1. **Dependência**: A app `avaliacoes` não cria alunos nem turmas; ela consome obrigatoriamente dados da app `academico`.
2. **Escopo**: Cada nota está vinculada a uma `School` para garantir o isolamento multi-tenant.
3. **Imutabilidade de Histórico**: Notas lançadas devem ser tratadas com rigor, mantendo o rasto de quem as lançou e quando.

## 📁 Estrutura de Arquivos

- `admin.py`: Interface administrativa para monitorização de notas.
- `apps.py`: Configuração da app de avaliações.
- `models.py`: Define os modelos de `Nota` (incluindo trimestres, tipos como ACS/MAP/ACP) e `Falta`.
- `serializers.py`: Serializadores para intercâmbio de dados de avaliação.
- `services.py`: **Lógica Pedagógica.** Contém as fórmulas para cálculo de médias (MACS, MT, MFD) e classificação de comportamento.
- `tests_grading.py`: Garante que os cálculos matemáticos de médias e regras de aprovação estão corretos.
- `urls.py`: Define os endpoints da API para avaliações.
- `views.py`: Processa o lançamento de notas por professores e visualização de pautas.
