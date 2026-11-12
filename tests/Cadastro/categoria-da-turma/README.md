# Categoria da Turma

Automação do cadastro acessado por `Cadastro > Categoria da Turma`.

O teste de criação lê `dados_categoria_da_turma.json`. `quantidade` define o número de registros; a descrição é um nome base e recebe sufixos sequenciais (`1`, `2`, ...). Se `descricao` ficar vazia, a factory escolhe aleatoriamente um nome temático iniciado por `QAAUTO - `. A quantidade omitida ou vazia usa `1`.

O teste realiza apenas a criação e mantém os registros para conferência no sistema. O login e a navegação usam os helpers existentes e a interface visível do SGE.

Para executar isoladamente, use `npx playwright test "tests/Cadastro/categoria-da-turma" --workers=1`.
