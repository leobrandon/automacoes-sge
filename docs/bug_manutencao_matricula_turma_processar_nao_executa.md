# Bug: em "Manutenção matrícula por turma", Processar não executa a operação e a linha marcada volta com "Não selecionado."

## Resumo
Em Aluno > Manutenção Matrícula > Manutenção matrícula por turma, depois de **Analisar** um aluno sem turma (operação "Alocar na turma.", checkbox já marcado), ao clicar em **Processar** a tela exibe a faixa verde "Executado Por favor verifique os resultados.", mas a coluna **Mensagem** da linha mostra **"Não selecionado."** e o aluno **não é alocado**. Uma nova análise do mesmo nome continua propondo "Alocar na turma.".

## Ambiente
- Homologação: https://homologa-sge.pontoid.com.br/
- Versão exibida no rodapé do SGE: 1.113.0.126 - 2026
- Perfil: Unidade Escolar (ESCOLA MUNICIPAL CULTURA), ano letivo 2026
- A tela só aparece com a permissão `ManutencaoMatriculaTurma` e fora de perfis de Coordenadoria/Diretoria Regional.

## Pré-condição
- Um aluno matriculado na unidade, sem turma (situação "<Não vinculado>" em Aluno > Cadastro). Usado: `QAAUTO ALUNO EVIDENCIA BUG` (matrícula MAT37378291).
- Uma turma ativa da unidade, sem alunos cursando. Usada: `QAAUTO 1º ANO - MATUTINO - 1 - 1º ANO - COMPOSIÇÃO DE ENSINO ANOS INICIAIS - Matutino/Manhã`.

## Passos para reproduzir
1. Abrir Aluno > Manutenção Matrícula > Manutenção matrícula por turma.
2. Em **Turma**, escolher a turma da pré-condição.
3. Em **Nome dos Alunos**, digitar o nome do aluno da pré-condição.
4. Clicar em **Analisar**. A linha aparece com Operações = "Alocar na turma." e o checkbox marcado (print 01).
5. Clicar em **Processar** (print 02).
6. Reabrir a tela, escolher a mesma turma, digitar o mesmo nome e clicar em **Analisar** (print 03).

## Resultado esperado
Conforme a regra MMT-003 do manual do dev ("o processamento aplica somente as linhas marcadas"), a operação da linha marcada é executada: o aluno é alocado na turma com situação "Cursando", a coluna Mensagem confirma a execução e uma nova análise mostra o aluno como já alocado (sem checkbox).

## Resultado obtido
- Faixa verde "Executado Por favor verifique os resultados." (indica sucesso).
- Coluna **Mensagem** da linha marcada: **"Não selecionado."** (print 02).
- O aluno não é alocado: a nova análise continua mostrando "Alocar na turma." e "Total: 0" em "Alunos sobressalentes da turma" (print 03).
- O aviso "Processamento completado!" existe na página, mas fica num bloco oculto (`#completedDisplay`).

## Frequência
Todas as tentativas (mais de 6), com 2 alunos diferentes, feitas na tela por script e por teste automatizado. O QA também reproduziu manualmente na tela e conferiu na turma que o aluno não foi alocado.

## Evidência técnica
Ao clicar em Processar, o navegador envia `POST /Matricula/ExecutarManutencaoMatricula` com `turmaId` (289928) e `guids` contendo o guid da linha marcada (o checkbox estava marcado, e o corpo da requisição tinha 1 guid). O servidor responde com a linha como "Não selecionado.".

Hipótese, não confirmada: o servidor não lê a lista `guids` enviada ou não encontra, na sessão, a operação criada na análise.

## Impacto
A tela não consegue alocar nem desalocar alunos, e a faixa verde "Executado" sugere sucesso quando nada foi feito. Isso induz o usuário a achar que a manutenção foi aplicada.

## Prints (com destaque em vermelho)
- `docs/evidencias/manutencao-matricula-turma/01-antes-de-processar.jpg`: análise com "Alocar na turma.", checkbox marcado e botão Processar.
- `docs/evidencias/manutencao-matricula-turma/02-nao-selecionado.jpg`: faixa "Executado" e coluna Mensagem com "Não selecionado.".
- `docs/evidencias/manutencao-matricula-turma/03-aluno-nao-alocado.jpg`: nova análise do mesmo nome ainda com "Alocar na turma.".
- `docs/evidencias/manutencao-matricula-turma/04-turma-alunos-na-turma-vazia.jpg`: Escola > Turma > turma da pré-condição, aba **Alunos na Turma** sem nenhum aluno (nem "Cursando"), depois de processar.
- `docs/evidencias/manutencao-matricula-turma/05-turma-identificacao.jpg`: a mesma turma aberta, com a Descrição `QAAUTO 1º ANO - MATUTINO - 1` em destaque, para identificar a turma do print 04.

## Impacto na automação
O teste `tests/Aluno/Manutenção Matrícula/Manutenção matrícula por turma/manutencao_matricula_turma_action.spec.ts` ("aloca aluno sem turma…") falha ao processar com este erro, mantendo a asserção. Os demais cenários do mesmo teste (reconhecer o vínculo, desalocar sobressalente, persistência) não são exercitados enquanto o defeito existir.
