# Progresso — automação de Nota Fiscal

## Correções após revisão

- Cada tentativa de gravação gera um identificador aleatório no campo textual Nº Contrato, com prefixo configurado e 10 dígitos hexadecimais. A exclusão exige esse formato, confere toda a identificação e compara o campo persistido antes de clicar em Excluir. Um JSON antigo com número/chave reutilizados e identificador diferente não coincide com o novo registro. A nota 1/900 permanece bloqueada explicitamente. O JSON de exclusão foi esvaziado para receber uma identificação de criação futura; notas antigas com o formato anterior não são aceitas pela exclusão atual.
- A identificação é impressa e comunicada ao ciclo antes da tentativa de salvar. A limpeza consulta a chave e só tenta excluir se houver uma linha; a conferência do identificador ocorre antes da exclusão. Falhas de consulta ou limpeza são relatadas. Uma gravação que termine no servidor depois de uma consulta vazia continua exigindo verificação manual.
- A varredura de paginação só termina sem rodapé quando a grade informa `<Nenhum resultado>`; grade sem resultado explícito e sem resumo lança erro em vez de presumir que não existem outras páginas.
- O prefixo configurado de Nº Contrato deve ser `QAAUTO` ou `QAAUTO` seguido por até dois caracteres alfanuméricos, para caber o identificador nos 20 caracteres da tela.
- `npx tsc --noEmit`: passou após as alterações. Primeira tentativa E2E falhou no login de 20 segundos, antes da criação; o spec do ciclo passou a usar 60 segundos, conforme diagnóstico anterior da homologação.
- Versão final: dois comandos independentes do spec `criar_e_excluir_nota_fiscal_action.spec.ts`, fora do sandbox, regression/workers=1/retries=0: **1 passed (21,9 s)** e **1 passed (20,2 s)**. Cada execução criou e removeu sua própria nota 2/900 com identificador distinto. As condições de falha de rede após a gravação e de rodapé ausente não foram reproduzidas nos E2E.

**Status: Concluído.** TypeScript, criação isolada, exclusão isolada e dois ciclos completos passaram. E2E executado fora do ambiente restrito a pedido do responsável, com `--project=regression --workers=1 --retries=0`.

## Painel

| Fase | Status |
| --- | --- |
| 0 — Preflight | Concluído |
| 1 — Exploração | Concluído |
| 2 — Implementação | Concluído |
| 3 — Validação | Concluído fora do ambiente restrito |
| 4 — Registro final | Concluído |

## Fase 0 — Preflight

- Plano `2026-11-12-automacao-nota-fiscal.md`, `CLAUDE.md`, skill `playwright-e2e-engineer`, referências de arquitetura, receitas SGE e templates lidos. Módulo-modelo Centro de Custos, factories/helpers de Fornecedor/CNPJ/datas/Select2, specs e configurações de custos lidos.
- `.env`: ambiente de homologação; `BASE_URL` consultado sem exibir outras variáveis.
- MCP Playwright: `browser_tabs` encontrou uma aba existente em `about:blank`, reutilizada. Navegação para `https://homologa-sge.pontoid.com.br/Acesso/Entrar`; snapshot confirmou a tela de login com os campos e botão esperados. Aguardando autenticação manual pelo responsável na janela MCP. Nenhum campo foi manipulado e nenhuma credencial foi gravada.
- Sessão confirmada por snapshot após autenticação manual: perfil `Secretaria de Educação`, secretaria `SECRETARIA MUNICIPAL BRANDÃO`, ano letivo 2026 e menu lateral visível. Linha de base `npx tsc --noEmit`: passou sem erros. Dados de apoio e inventário de unidades confirmados.
- Após a autenticação, a consulta abriu pelo menu visível **Financeiro > Documentos Fiscais > Nota Fiscal**. A aba em `about:blank` foi reutilizada; nenhum item irmão (Importação XML) foi aberto.
- Inventário pelo Select2 do formulário: fornecedor `QAAUTO Fornecedor Pessoa Jurídica 1` disponível (CNPJ exibido: `89.379.821/0001-94`); Destinatário oferece Secretaria de Educação, DRE BRANDAO e as escolas ESCOLA ESTADUAL DAS OLIVEIRAS, ESCOLA MUNICIPAL CULTURA, ESCOLA RURAL ABELHA e SECRETARIA MUNICIPAL DOS BRANDÃO. A nota existente usa ESCOLA MUNICIPAL CULTURA. Destinatário escolhido só no formulário ainda não salvo.
- A linha existente foi conferida na grade com Número 1 / Série 900 e continua intocada. A consulta mostra 1 registro e 9 colunas: Secretaria / Unidade Escolar, Data de Cadastro, Fornecedor, Número, Série, Chave De Acesso, Data de Emissão, Valor e Possui Anexo; paginação padrão 10. Filtros visíveis: referência (Data de cadastro ou Data de emissão), Data Início, Data Fim, Tipo de Nota, Fornecedores e Secretaria / Unidade Escolar. Pesquisa: campo `#searchTerm`, botão `#btnSubmitSearch`; busca da grade ainda será observada ao pesquisar. Botão Adicionar tem título `Adicionar Nota Fiscal`; colunas têm controle próprio.
- Tela Novo: `formNotaFiscal`, rota de edição observada `/notafiscal/editar/0`. Obrigatórios marcados em vermelho: Destinatário (`DestinatarioId`), Fornecedor (`FornecedorId`), Data de emissão (`DataEmissao`), Chave de acesso (`ChaveDeAcesso`), Número (`Numero`) e Série (`Serie`). Limites/classes: chave numérica maxlength 44, número numérico maxlength 9, série maxlength 3; datas usam datepicker `dd/mm/yy`. Não há campo de observação nem aba Itens no cadastro Novo; a seção Valores está `display:none`. Na nota existente aberta somente para leitura, a aba Itens mostra `<Nenhum item adicionado>`, total R$ 0,00, e a coluna da grade mostra `Possui Anexo: Não`; existem abas de histórico e Anexo (sem asterisco obrigatório). Programa financeiro, contrato vinculado ao programa e orçamento são opcionais; nenhum está selecionado. CNPJ do fornecedor aparece após seleção; CNPJ do destinatário permaneceu vazio para a escola escolhida. No cadastro existente, o campo textual `Nº Contrato` contém `QAAUTO NF 1`; nas notas próprias será usado `QAAUTO NF 2`.
- Pela documentação de negócio via MCP `sue_regras_negocio`, a nota pode atualizar execução de orçamento ou apuração de contrato associado; a criação proposta deixará programa, contrato e orçamento sem seleção. A UI não apresenta itens, vínculo de custo/estoque ou upload nesta tela. Divergência/validação ainda pendente: aceitar nota sem itens com total zero, conforme nota preexistente de R$ 0,00.
- Rede observada via navegador: GET `/notafiscal` (consulta), GET `/notafiscal/editar/0`, GET `/NotaFiscal/ObtenhaContratosDoFornecedor?fornecedorId=937`, GET `/NotaFiscal/VerificaDestinatario?destinatarioId=13616` e GET `/NotaFiscal/ObtenhaOrcamentosValidos?destinatarioValue=escola:13616` (duas chamadas observadas). A grade usa GET `/notafiscal/indexgrid`; salvar usa POST `/NotaFiscal/POSTEditar` (200) e reabre `/NotaFiscal/Editar?id=<id>`; excluir usa POST `/NotaFiscal/ExcluaNotaFiscal` (200). O `searchTerm` é global/parcial: o termo `2` trouxe Número 1 porque a chave contém esse algarismo, então a automação também conferirá células exatas. Com filtro QAAUTO e intervalo 01/01/1900–31/12/2099, a consulta mostrou só a nota existente; a Série 900 está ocupada pelo Número 1, e o Número 2 está livre. As chamadas de mutação foram provocadas só por botões visíveis.
- A chave válida `52261189379821000194559000000000021000000023` não preencheu Número ou Série quando digitada; os três campos são independentes. DV módulo 11 calculado: 3. A criação exploratória foi aceita com destino ESCOLA MUNICIPAL CULTURA, fornecedor PJ QAAUTO (CNPJ 89.379.821/0001-94), data 12/11/2026, Número 2/Série 900, texto `Nº Contrato = QAAUTO NF 2`, sem programa, contrato vinculado, orçamento, itens ou anexo. Total R$ 0,00. Toast observado: `Sucesso! Nota Fiscal adicionada.`; o cadastro reabriu com todos os valores e a grade confirmou a linha exata.
- Tentativa de duplicidade com a mesma combinação foi recusada. Mensagens inline exatas: `A chave de acesso já está sendo utilizada em outro cadastro.` e `Já existe uma nota fiscal com o número 2 cadastrada para este fornecedor.`; aviso `Atenção! Verifique os dados informados.`. A consulta confirmou uma única linha da nota QAAUTO.
- Exclusão da nota criada: confirmação `Esta ação irá excluir a nota fiscal selecionada, uma vez excluída, não é possível recuperá-la. Deseja continuar?` (Sim/Não); toast `Nota Fiscal removida!`. Nova consulta exata retornou `<Nenhum resultado>`.
- DV inválido: a chave `52261189379821000194559000000000021000000024` foi aceita com o mesmo fornecedor/unidade/número/série/data e `Nº Contrato = QAAUTO NF 2`; toast `Sucesso! Nota Fiscal adicionada.`. O produto não valida DV módulo 11. O registro de teste foi imediatamente excluído pelo formulário; a busca exata pela chave voltou sem resultado. A implementação seguirá gerando chave válida, como exige o plano.
- Massa intocável: nota preexistente da combinação Número 1 / Série 900 / fornecedor QAAUTO Fornecedor Pessoa Jurídica 1; não alterar nem excluir.

## Manifesto

- Criado: `docs/superpowers/plans/2026-11-12-automacao-nota-fiscal-progresso.md`.
- Criados: `src/factories/nota-fiscal.factory.ts`, `src/helpers/navigation/nota-fiscal.navigation.ts`, `src/actions/criar-nota-fiscal.action.ts`, `src/actions/excluir-nota-fiscal.action.ts`.
- Criados em `tests/Financeiro/Documentos Fiscais/nota-fiscal/`: `criar_nota_fiscal_action.spec.ts`, `excluir_nota_fiscal_action.spec.ts`, `criar_e_excluir_nota_fiscal_action.spec.ts`, `nota_fiscal_config.ts`, `dados_nota_fiscal.json`, `dados_exclusao_nota_fiscal.json`.
- Alterados somente os exports dos módulos existentes: `src/actions/index.ts`, `src/helpers/navigation/index.ts`, `src/factories/index.ts`.
- Factory determinística com DV módulo 11; busca paginada por fornecedor e datas amplas; número livre sem apagar dados; confirmação de persistência em cadastro reaberto e grade; exclusão com combinação exata, bloqueio duro da nota protegida e sem lote; ciclo com limpeza reversa e AggregateError.

## Exploração

- Exploração concluída: consulta, filtros, colunas, opções de apoio, formulário e abertura de registro por clique em célula foram observados. As duas notas exploratórias (DV válido e DV inválido) foram excluídas e consultadas sem resultado. A única nota remanescente é a protegida Número 1 / Série 900, que permanece inalterada.

## Validação

### Resultado final — 12/11/2026

Todos os comandos abaixo foram executados separadamente na raiz do projeto; E2E fora do ambiente restrito:

| Comando | Resultado |
| --- | --- |
| `npx tsc --noEmit` | Código 0; linha de base, implementação e ambas as correções sem erros. |
| `npx playwright test "tests/Financeiro/Documentos Fiscais/nota-fiscal/criar_nota_fiscal_action.spec.ts" --project=regression --workers=1 --retries=0` | Código 0; 1 passed (17.0s), teste 15.9s. |
| `npx playwright test "tests/Financeiro/Documentos Fiscais/nota-fiscal/excluir_nota_fiscal_action.spec.ts" --project=regression --workers=1 --retries=0` | Código 0; 1 passed (11.5s), teste 10.5s. |
| `npx playwright test "tests/Financeiro/Documentos Fiscais/nota-fiscal/criar_e_excluir_nota_fiscal_action.spec.ts" --project=regression --workers=1 --retries=0` — execução 1 | Código 0; 1 passed (21.3s), teste 20.2s. |
| `npx playwright test "tests/Financeiro/Documentos Fiscais/nota-fiscal/criar_e_excluir_nota_fiscal_action.spec.ts" --project=regression --workers=1 --retries=0` — execução 2 | Código 0; 1 passed (20.3s), teste 19.3s. |

- Combinação retornada pela criação isolada e conferida no JSON de exclusão: fornecedor QAAUTO PJ 1, CNPJ `89.379.821/0001-94`, unidade ESCOLA MUNICIPAL CULTURA, Número 2/Série 900, chave `52261189379821000194559000000000021000000023`, emissão/cadastro 12/11/2026, Nº Contrato `QAAUTO NF 2`, total 0,00. A exclusão isolada removeu essa nota; os ciclos reutilizaram o número livre 2 e removeram suas próprias notas.
- A criação comprovou mensagem de sucesso, campos do cadastro reaberto e cada coluna da linha. Cada exclusão comprovou mensagem de sucesso e pesquisa sem a chave criada.
- Consulta atualizada no MCP pelo botão visível de pesquisa após os dois ciclos: somente um registro, a nota protegida Número 1/Série 900, emissão/cadastro 11/11/2026 e chave terminada em `00000018`. Nenhuma nota própria remanescente. Snapshot final: `.playwright-mcp/page-2026-11-12T14-55-50-155Z.yml`.
- Últimas alterações desta retomada: `nota-fiscal.navigation.ts` (tratamento distinto de fechamento dos sucessos), `dados_exclusao_nota_fiscal.json` (identificador retornado pela criação), este progresso. Nenhum helper compartilhado foi alterado.

### Retomada fora do ambiente restrito

- Responsável instruiu executar fora do ambiente restrito; execução escalada autorizada, sem mudar rede, URL ou configuração compartilhada.
- Criação isolada, primeira execução externa: login funcionou; nota 2/900, chave `52261189379821000194559000000000021000000023`, emissão/cadastro 12/11/2026, Nº Contrato `QAAUTO NF 2`, foi gravada. Falha após salvar: click no Ok disputou com o fechamento automático do popup, removido durante animação; timeout de 180000 ms. Evidência: `test-results/Financeiro-Documentos Fisc-44431-ervar-para-exclusão-isolada-regression/error-context.md` (pode ser sobrescrita pela próxima execução).
- Primeira correção: criação aguarda desaparecimento do popup após comprovar mensagem capturada pelo observer.
- Exclusão de limpeza da nota criada, via spec isolado com JSON exato: POST e mensagem `Nota Fiscal removida!` confirmados, porém o teste falhou ao aguardar desaparecimento automático (10000 ms). A exclusão mantém o Ok visível, diferentemente da criação. Evidência: `test-results/Financeiro-Documentos Fisc-5f5a0-AAUTO-informada-da-execução-regression/error-context.md`.
- Correção fundamentada na diferença observada: criação aguarda fechamento automático; exclusão clica no Ok persistente. Nenhum force, sleep, retry ou alteração de assertion de persistência.
- `npx tsc --noEmit`: código 0 após cada uma dessas duas correções.
- Nova sequência obrigatória iniciada: criação isolada, exclusão isolada e dois ciclos separados, todos fora do ambiente restrito com `--project=regression --workers=1 --retries=0`.

### Registro da primeira execução no ambiente restrito (histórico)

- `npx tsc --noEmit` (linha de base e duas verificações após implementação): código 0 nas três execuções, sem erros.
- Criação isolada: comando abaixo executado, código 1, um teste descoberto e uma falha em 363 ms. Falhou no `page.goto` do helper existente `loginSge`, antes de preencher login ou iniciar a navegação Financeiro: `net::ERR_NAME_NOT_RESOLVED at https://homologa-sge.pontoid.com.br/Acesso/Entrar?ReturnUrl=%2f`.
- Evidência gerada pelo runner: `test-results/Financeiro-Documentos Fisc-44431-ervar-para-exclusão-isolada-regression/error-context.md`.
- Exclusão isolada: **não executada**, pois a criação não ocorreu.
- Ciclo completo, execução 1: **não executado**.
- Ciclo completo, execução 2: **não executado**.
- Nenhuma tentativa de contornar DNS/rede, trocar de navegador de exploração, retry ou execução da suíte inteira. As ações da implementação ainda não foram validadas E2E; a exploração manual não equivale à execução dos specs.
- Revisão estática: exatamente três specs; não há waitForTimeout, force, XPath, .first(), .nth(), skip ou fixme nos arquivos novos. Os catches do ciclo acumulam e relançam erros em AggregateError.

### Comandos de reprodução

Executar fora do ambiente restrito, na ordem, interrompendo na primeira falha:

```powershell
npx tsc --noEmit
npx playwright test "tests/Financeiro/Documentos Fiscais/nota-fiscal/criar_nota_fiscal_action.spec.ts" --project=regression --workers=1 --retries=0
```

Antes da exclusão isolada, atualizar `dados_exclusao_nota_fiscal.json` com a combinação exibida pela nova criação. O JSON entregue registra a combinação 2/900 validada nesta execução, já removida; executar a exclusão sozinha agora deve falhar por ausência. Nunca apontar para a nota preexistente nem para as notas exploratórias removidas.

```powershell
npx playwright test "tests/Financeiro/Documentos Fiscais/nota-fiscal/excluir_nota_fiscal_action.spec.ts" --project=regression --workers=1 --retries=0
npx playwright test "tests/Financeiro/Documentos Fiscais/nota-fiscal/criar_e_excluir_nota_fiscal_action.spec.ts" --project=regression --workers=1 --retries=0
npx playwright test "tests/Financeiro/Documentos Fiscais/nota-fiscal/criar_e_excluir_nota_fiscal_action.spec.ts" --project=regression --workers=1 --retries=0
```

## Massa QAAUTO remanescente

- Nenhuma massa criada nesta execução. A nota preexistente Número 1 / Série 900 é intocável e não pertence à automação.

## Limitações conscientes

- Limitação observada: o SGE aceita chave de 44 dígitos cujo DV módulo 11 está incorreto; as specs e a factory ainda gerarão somente chaves válidas determinísticas.
- Cenário limitado a nota sem itens e total calculado R$ 0,00. Anexo opcional, sem upload; sem programa financeiro, contrato vinculado ou orçamento. `Nº Contrato` é texto QAAUTO e não o vínculo de contrato financeiro.
- Exclusão em lote recusada: prefixo do fornecedor não prova que todas as notas pertencem à execução. A exclusão exige identificação completa e bloqueia explicitamente Número 1/Série 900 da massa protegida.
- Filtros de data são reaplicados em cada pesquisa (01/01/1900–31/12/2099), pois a tela restaura valores padrão ao voltar. A busca é parcial/global e exige comparação exata de células; há uma coluna inicial oculta. A sequência considera números do fornecedor em todas as séries, pois a recusa observada menciona fornecedor+número.
- Restrição de execução observada: o runner no ambiente restrito apresentou ERR_NAME_NOT_RESOLVED. Execução externa autorizada pelo responsável resolveu o acesso; criação, exclusão e os dois ciclos passaram.
- Feedback de sucesso assimétrico: criação fecha automaticamente ao recarregar, enquanto exclusão mantém Ok até clicar. A navegação trata cada caso explicitamente.
