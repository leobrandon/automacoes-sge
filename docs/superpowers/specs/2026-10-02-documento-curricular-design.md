# Design: automação de Documento Curricular

## Objetivo

Adicionar ao projeto Playwright do SGE automações isoladas para criar e excluir Documento Curricular e para abrir um Documento Curricular QAAUTO em edição, adicionar estruturas ordenadas, vincular Ano Escolar e Componente e cadastrar um item em cada estrutura no componente vinculado. Toda navegação e preparação de dados ocorrerão pela interface visível do sandbox.

## Requisitos e limites

- Entrar no sandbox usando o .env existente, sem imprimir ou persistir credenciais.
- Navegar por Cadastro > Ensino > Documento Curricular, sem acessar rotas internas diretamente.
- Seguir os módulos e convenções atuais de src/actions, src/factories, src/helpers/navigation e tests/Cadastro.
- Executar o Playwright com workers: 1.
- Usar QAAUTO seguido por uma descrição significativa e uma sequência numérica por execução.
- Guardar dados editáveis em dados_documento_curricular.json e preferências de exclusão em dados_exclusao_documento_curricular.json.
- A configuração vazia deve escolher valores válidos apresentados pela UI. Para Ano Escolar e Componente, escolher um par disponível e compatível; não tratar uma combinação sem Componentes como sucesso nem pular a inclusão. Valores configurados são preferências: se não estiverem disponíveis/compatíveis na sessão, resolver pelas opções visíveis para uma alternativa válida e seguir o fluxo, registrando no resultado os valores realmente escolhidos.
- A edição configurará duas estruturas ordenadas por padrão, com opção de configurar mais; cada estrutura terá ao menos um item configurável. Criar os itens respeitando a dependência entre níveis: o item do nível seguinte deve apontar para item existente do nível imediatamente anterior quando a UI exigir esse relacionamento.
- Antes da implementação, explorar pela UI visível os modais de inclusão de item nos dois tipos de estrutura (com e sem código), identificar campos obrigatórios e controles para relacionar item pai. Não inferir nomes de campos/seletores a partir do print.
- A especificação de exclusão terá excluirTodasQAAUTO: false por padrão. Com false, exige a descrição exata do registro alvo; com true, limita a exclusão aos registros cujo nome comece por QAAUTO, localizados e removidos pela interface.
- A edição nunca seleciona registros não-QAAUTO. O cenário de edição cria seu próprio Documento Curricular configurado pela UI e então abre esse registro, evitando dependência da execução de outro teste e mutação de massa preexistente.
- Criação e edição preservam o registro para conferência; exclusão é um cenário separado.

## Estrutura proposta

- src/factories/documento-curricular.factory.ts: montar os dados com sequência, QAAUTO e validação de campos configuráveis.
- src/helpers/navigation/documento-curricular.navigation.ts: navegar pela interface e localizar uma linha por descrição.
- src/actions/criar-documento-curricular.action.ts: preencher Descrição e Composição de Ensino e confirmar que o registro aparece na consulta.
- src/actions/editar-documento-curricular.action.ts: abrir uma descrição QAAUTO, incluir estruturas em ordem e, em Componentes, selecionar Ano Escolar e um Componente compatível; abrir o componente e cadastrar um item em cada aba de estrutura, mantendo os vínculos pai-filho.
- src/actions/excluir-documento-curricular.action.ts: excluir um registro exato ou, somente com a flag habilitada, os registros QAAUTO encontrados na consulta.
- Exportar os novos contratos pelos barrels src/actions/index.ts, src/factories/index.ts e src/helpers/navigation/index.ts.
- tests/Cadastro/documento-curricular/: JSONs de criação e exclusão, configuração, specs de factory e três specs de ação — criar, editar/adicionar filhos e excluir.

## Dados e fluxo

dados_documento_curricular.json incluirá quantidade, descricao, composicaoEnsino, estruturas (lista ordenada com descricao, possuiCodigo e ativo, mais itens), anoEscolar e componente. Cada item terá descrição, estado ativo, código quando a estrutura exigir e referência ao item pai quando necessário. Os valores padrão terão prefixo QAAUTO, descrição significativa e sequência numérica; campos vazios de seleção terão valores válidos derivados das opções exibidas na UI. Para exercício mínimo da hierarquia, a configuração padrão terá duas estruturas e um item por estrutura. A preferência observada para um fluxo completo no sandbox é ENSINO MÉDIO INOVADOR, 2° SÉRIE e ARTES. A automação tenta primeiro os valores configurados e, se não houver opção compatível, seleciona e devolve uma alternativa compatível exibida pela UI. dados_exclusao_documento_curricular.json conterá excluirTodasQAAUTO, termoGeral e descricao.

A spec de edição cria primeiro seu próprio Documento Curricular com a configuração da spec, consulta esse registro pela descrição e o abre pela linha visível. Na aba Estrutura, adiciona as estruturas configuradas em ordem e confirma ordem, descrição, código e estado na grade. Na aba Componentes, escolhe o Ano Escolar configurado ou uma opção disponível, espera as opções dependentes e seleciona um Componente configurado ou compatível retornado pela UI. A preferência observada é ENSINO MÉDIO INOVADOR / 2° SÉRIE / ARTES. Se essas preferências não estiverem disponíveis, usa as alternativas compatíveis da interface e retorna os valores efetivamente escolhidos. Após salvar, abre a edição do Componente associado pela própria tela e confere uma aba por estrutura. Em cada aba, inclui e confirma o item configurado. Se a UI exigir vínculo entre níveis, o item do nível seguinte seleciona o item persistido no nível anterior; a automação confirma os valores renderizados em cada grade e o vínculo exibido. Campos/seletores concretos dos modais foram definidos pela exploração visual dos dois tipos de estrutura.

## Verificação

- Testes unitários da factory/configuração para prefixo e sequência QAAUTO, valores padrão, múltiplas estruturas e itens em ordem, referência ao item pai, campos configuráveis e validação da flag de exclusão.
- Specs de regressão pelo projeto regression, com credenciais lidas pelo setup existente, --workers=1 --retries=0.
- Executar os fluxos E2E necessários duas vezes de forma independente. Confirmar criação/persistência e filhos pela grade/telas; no cenário de exclusão, confirmar o desaparecimento do registro selecionado.
- Não enfraquecer assertions nem converter indisponibilidade de opção ou falha funcional em aprovação/skip. Separar erros de infraestrutura de falhas de locators e de dados.

## Evidência de UI já observada

No sandbox, a criação pede Descrição e Composição de Ensino. A edição possui as abas Estrutura e Componentes. A estrutura inclui ordem automática, possui código, ativo e descrição. O modal de Componentes pede Ano Escolar e Componente. Um Documento Curricular existente mostrou 6º Ano com ARTES e BIOLOGIA; ao selecionar 7º Ano para inspeção no mesmo registro, não apareceu resultado de Componente. Por isso o fluxo selecionará um par compatível apresentado pela própria UI e não dependerá de combinações supostas. Os prints adicionais mostram que estruturas distintas aparecem como abas independentes na edição do Componente, cada qual com grade própria; a estrutura seguinte pode apresentar coluna associada ao item do nível anterior. A exploração antes da implementação confirmará os campos de criação e o seletor do relacionamento pai.

## Fora do escopo

Alterar documentos existentes fora de QAAUTO, modificar o produto SGE, preparar dados via API/banco e excluir dados automaticamente ao final de criação/edição.

