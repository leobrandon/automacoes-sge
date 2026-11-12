# Especificação: automação do Tipo de Ocorrência Escolar

## Objetivo

Criar dois specs Playwright independentes para o cadastro em **Cadastro > Tipo de Ocorrência Escolar** no SANDBOX: um cria um tipo QAAUTO com parametrização declarada em JSON e confirma que ela foi salva; o outro remove somente a descrição exata configurada no seu próprio JSON e verifica que ela deixou de aparecer na consulta.

O cadastro representa a configuração de como futuras ocorrências escolares serão preenchidas. Estes specs não criarão ocorrências escolares, alunos, responsáveis ou servidores.

## Entendimento confirmado

- O cadastro do tipo define descrição, situação e quais campos da ocorrência escolar ficam ocultos, opcionais ou obrigatórios: Natureza, Data, Turno, Hora, Descrição, Procedimento e Envolvidos.
- A tela oferece os valores **Não**, **Sim** e **Sim e Obrigatório** para cada uma dessas sete configurações. Todos precisam ter um valor.
- Quando **Informar Envolvidos** está como **Sim e Obrigatório**, a aba **Dados dos envolvidos** é exibida e requer ao menos uma categoria habilitada.
- Valores de categorias definidos pelo usuário: **Aluno = Sim**, **Responsável do Aluno = Sim**, **Servidor = Sim** e **Outro = Não**.
- O texto da descrição do tipo é obrigatório e aceita até 100 caracteres. O registro terá Ativo = Sim.
- A tela permite campos personalizados e outras configurações de ocorrência, impressão e disposição. Elas não fazem parte deste primeiro cenário.

### Parametrização inicial proposta

Esta combinação exercita as três opções observadas sem ativar configurações extras de natureza:

| Configuração | Valor a gravar no JSON |
|---|---|
| Natureza da Ocorrência | Não |
| Data da Ocorrência | Sim e Obrigatório |
| Turno da Ocorrência | Sim |
| Hora da Ocorrência | Não |
| Descrição da Ocorrência | Sim e Obrigatório |
| Procedimento Adotado | Sim |
| Informar Envolvidos | Sim e Obrigatório |
| Permite informar Aluno | Sim |
| Permite informar Responsável do Aluno | Sim |
| Permite informar Servidor | Sim |
| Permite informar Outro envolvido | Não |

O restante das opções auxiliares — encaminhamento ao Conselho, ocorrência anterior, histórico de ações, impressão, dados de infrequência, exigência de responsável para menor e layout — ficará fora das assertions e permanecerá como apresentado por padrão na tela. Não serão criados valores filhos de Natureza nem campos personalizados.

## Evidência e fontes

- A árvore de menus da base local associa o cadastro a Cadastro e à rota de aplicação `/tipoocorrenciaescolar`; o manual situa o lançamento de uma ocorrência em **Escola > Ocorrências > Escolares** e descreve o vínculo de envolvidos: [árvore de submenus](<E:/Projetos Agentes IA/Projeto Ponto iD/base_de_conhecimento/sge_arvore_submenus_detalhada.md:193>) e [manual da visão da unidade escolar](<E:/Projetos Agentes IA/Projeto Ponto iD/base_de_conhecimento/manual_visao_unidade_escolar.md:251>).
- A base local registra exemplos de ocorrências escolares e regras de relatório: [documentação de relatórios e ocorrências](<E:/Projetos Agentes IA/Projeto Ponto iD/base_de_conhecimento/documentos_relatorios_e_ocorrencias.md:99>).
- A documentação do desenvolvedor consultada foi [Tipo de Ocorrência Escolar](http://192.168.88.109:8081/cadastros/tipo-de-ocorrencia-escolar.html). Ela descreve os campos de configuração, validação de pelo menos uma categoria de envolvido e remoção dos cadastros filhos. Não confirma o efeito de excluir um tipo já usado por ocorrências.
- Na [wiki Ponto iD](https://wiki.pontoid.com.br/), inclusive na [Central de Ajuda consultada](https://wiki.pontoid.com.br/faq/todosfaqs), não foi localizado artigo específico para este cadastro.
- Snapshots e capturas visuais do menu, formulário de inclusão, opções, campos personalizados, categorias de envolvidos, grade e formulário de edição estão em `.playwright-mcp/`, incluindo `tipo-ocorrencia-escolar-sge-formulario.yml`, `tipo-ocorrencia-escolar-sge-config-opcoes.yml`, `tipo-ocorrencia-escolar-sge-campos-personalizados.yml`, `tipo-ocorrencia-escolar-sge-dados-envolvidos.yml`, `tipo-ocorrencia-escolar-sge-edicao-existente.yml` e `tipo-ocorrencia-escolar-sge-edicao-envolvidos.yml`.
- Nenhum tipo foi criado, salvo ou excluído durante a exploração. A tela de edição de um tipo existente foi aberta apenas para leitura e fechada com **Voltar**.

## Abordagens consideradas

1. **Um spec combinado de criação e exclusão:** reduz arquivos, mas torna a exclusão automática parte da criação e impede revisão isolada de cada fluxo.
2. **Specs separados com toda a navegação e interação duplicadas:** preserva os dois fluxos, mas duplica consulta, sincronização e localização de linha.
3. **Recomendado — specs separados com navegação e ações específicas compartilhadas:** preserva arquivos e JSONs independentes, centraliza somente operações comuns da UI e mantém cada resultado fácil de localizar e revisar.

## Estrutura proposta

```text
tests/Cadastro/Tipo de Ocorrência Escolar/
  criar_tipo_ocorrencia_escolar_action.spec.ts
  dados_tipo_ocorrencia_escolar.json
  excluir_tipo_ocorrencia_escolar_action.spec.ts
  dados_exclusao_tipo_ocorrencia_escolar.json

src/helpers/navigation/tipo-ocorrencia-escolar.navigation.ts
src/actions/criar-tipo-ocorrencia-escolar.action.ts
src/actions/excluir-tipo-ocorrencia-escolar.action.ts
src/factories/tipo-ocorrencia-escolar.factory.ts
```

O helper de navegação abre Cadastro e Tipo de Ocorrência Escolar pelo menu visível, espera o carregamento assíncrono, pesquisa a descrição e retorna a linha exata. A factory valida os dados de criação e monta a descrição determinística. As ações cuidam do formulário e da exclusão; os dois specs apenas leem seus próprios JSONs, chamam a ação correspondente e registram o resultado após a confirmação funcional. Barrels existentes serão atualizados apenas se necessários às importações.

O JSON de criação terá quantidade 1, descrição-base `QAAUTO Tipo de Ocorrência Escolar`, Ativo = Sim e a parametrização proposta acima. O resultado será `QAAUTO Tipo de Ocorrência Escolar 1`. O JSON de exclusão conterá somente essa descrição exata e uma flag explícita que restringe a ação às descrições listadas.

## Fluxo e prova funcional

### Criação

1. Validar que a URL configurada aponta para `sandbox.pontoid.com.br` e autenticar pelo helper existente.
2. Abrir a consulta navegando por Cadastro > Tipo de Ocorrência Escolar na interface visível; não acessar a rota interna diretamente.
3. Abrir o formulário Adicionar, definir os sete valores do JSON, selecionar as quatro categorias de envolvidos e manter as opções secundárias no padrão atual da tela.
4. Salvar, aguardar o feedback de sucesso e pesquisar a descrição QAAUTO exata.
5. Exigir uma linha única com a descrição e situação esperadas. Abrir essa linha, que pela exploração abre **Editar Tipo de Ocorrência Escolar**, conferir no formulário os sete valores persistidos e as quatro categorias; sair com **Voltar** sem alterar o registro.
6. Preservar o registro para que o spec separado de exclusão possa consumi-lo. Emitir o log de criação somente depois da confirmação na grade e da leitura dos valores persistidos.

### Exclusão

1. Autenticar no SANDBOX e navegar pelo menu visível até a consulta.
2. Pesquisar somente a descrição exata listada no JSON; exigir uma linha e conferir sua descrição antes de abrir a edição.
3. Acionar Excluir somente dentro da edição do registro exato e aceitar apenas um diálogo de confirmação visível e explícito.
4. Após a confirmação, exigir a mensagem de sucesso, pesquisar novamente a mesma descrição e confirmar zero linhas.
5. Emitir o log de exclusão somente após a ausência efetiva na grade.

O texto do diálogo de exclusão não foi observado: o auto-review bloqueou o clique em Excluir ao inspecionar um tipo existente que não era QAAUTO, pois esse clique poderia remover o tipo e configurações filhas. Nenhuma exclusão ocorreu. A implementação deverá observar o diálogo ao operar sobre o tipo QAAUTO criado por este cenário e então usar seus controles visíveis; não se deve usar um tipo de sistema como alvo para descobrir a confirmação.

## Limites de segurança e dados

- Toda navegação, leitura, criação, consulta e exclusão é feita pela interface visível. Não usar APIs de mutação, banco ou rotas internas.
- Os specs são independentes. A criação não consulta previamente nem exclui automaticamente o registro; o usuário executa a exclusão quando quiser remover a massa criada.
- A exclusão aceita apenas descrição QAAUTO exata configurada, exige uma linha única e nunca usa busca ampla por prefixo.
- A remoção do tipo apaga configurações filhas como categorias de envolvidos, natureza, campos personalizados e opções de impressão. O efeito sobre ocorrências existentes não está validado; por isso a exclusão automatizada fica limitada ao cadastro exato criado pelo próprio spec, sem ocorrência vinculada.
- Não alterar os tipos já existentes no sandbox. Não salvar mudanças durante inspeções de edição.
- Usar `workers: 1`, assertions web-first e logs explícitos após confirmação visual. Não usar `waitForTimeout` como sincronização normal.
- Não incluir credenciais nos arquivos versionados.

## Critérios de aceite

- Existem um spec e um JSON próprios para criação e outro spec e JSON próprios para exclusão, dentro da pasta que corresponde ao caminho Cadastro > Tipo de Ocorrência Escolar.
- A criação configura os sete campos com os valores declarados no JSON, ativa Aluno, Responsável do Aluno e Servidor, desativa Outro e confirma os valores salvos reabrindo o tipo pela grade.
- O registro de criação permanece salvo até a execução explícita do spec de exclusão.
- A exclusão nunca interage com uma linha ambígua e confirma que a descrição exata deixou a grade.
- Os arquivos mantêm nomes QAAUTO determinísticos com sequência, usam `workers: 1` e não armazenam credenciais.
- A validação E2E exigida pelo skill local consiste em executar o par de specs em ordem de criação e exclusão duas vezes com estado limpo entre os pares, `--workers=1` e `--retries=0`. Nenhuma execução E2E é feita durante a etapa de especificação.

## Fora de escopo

- Cadastrar uma ocorrência escolar, aluno, responsável ou servidor.
- Configurar naturezas filhas, campos personalizados, layouts ou impressão.
- Cobrir todos os valores possíveis de cada toggle ou todas as combinações de encaminhamento, histórico e infrequência.
- Excluir tipos existentes, apagar registros por prefixo QAAUTO ou validar remoção de tipos já usados em ocorrências.
