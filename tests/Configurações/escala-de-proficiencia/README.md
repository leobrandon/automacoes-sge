# Escala de Proficiência

Automação do caminho **Configurações > Escala de Proficiência**. A cobertura inclui criação, conferência dos parâmetros e exclusão do registro gerado pela própria execução.

O teste usa código numérico, descrição com prefixo `QAAUTO`, uma composição sem outra escala ativa e uma única faixa válida de pontuação, idade e equivalência. Os valores do JSON são massa técnica de teste; não representam uma escala pedagógica aprovada.

O SGE permite apenas uma escala ativa por composição. Se outra escala ativa já estiver configurada, a automação interrompe a criação e informa a composição, sem desativar nem excluir registros existentes. A exclusão confere código, descrição e composição antes de remover somente o registro QAAUTO criado pelo teste.

As regras de campos e de faixas seguem a documentação oficial do catálogo SUE para esta tela. Parâmetros não cobrem obrigatoriamente todo o intervalo de pontuação.
