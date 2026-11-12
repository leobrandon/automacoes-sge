# Planejamento — Conselho Tutelar > Conselheiros

**Status: aprovado pelo responsável; execução iniciada.**
Data: 12/11/2026. Ambiente: homologação.

Este documento planeja a automação; nenhum código de automação foi criado ou alterado nesta etapa. A inspeção foi feita no navegador interno, conforme pedido, com login manual. Não foi salvo nenhum conselheiro.

## 1. Objetivo e escopo proposto

Automatizar exclusivamente **Conselho Tutelar > Conselheiros**, seguindo as camadas e convenções do projeto.

Cobertura proposta, condicionada à confirmação de exclusão efetiva pela UI:

1. Criar um conselheiro novo QAAUTO e comprovar persistência; criação isolada preserva o registro.
2. Excluir individualmente esse registro, identificado por nome e CPF exatos, comprovando ausência.
3. Executar o ciclo criar + excluir, com limpeza somente da massa da execução, duas vezes em comandos independentes.

**Ressalva de viabilidade:** a referência de negócio não confirma exclusão funcional. Não prometer nem implementar exclusão ou ciclo que só inative o conselheiro. Se a UI não permitir exclusão efetiva, interromper e apresentar ao responsável o escopo possível antes de continuar.

Fora do escopo: Ocorrências, FICAI, conversão de pessoa existente, edição de pessoas preexistentes, foto/upload, cadastro de telefones após salvar, envio de email/SMS, definição de presidente, manutenção de usuários/permissões e exclusão em lote.

## 2. Evidências já obtidas no navegador interno

- Homologação aberta em `https://homologa-sge.pontoid.com.br/`; responsável realizou login manual. Nenhuma credencial lida ou preenchida pelo agente.
- Sessão: Secretaria de Educação, SECRETARIA MUNICIPAL BRANDÃO, ano letivo 2026, versão exibida 1.113.0.126.
- Caminho percorrido: menu visível **Conselho Tutelar > Conselheiros**; Ocorrências não foi aberto.
- Consulta: título `Consulta de Conselheiros`, busca `searchTerm`, botão `btnSubmitSearch`, filtros `btnFiltros`, Adicionar `btnAdicionar`.
- Colunas visíveis: Nome, CPF, Telefone, Email, Data de Cadastro. Consulta inicial apresentou `<Nenhum resultado>` com filtro `SomenteAtivos` marcado. Isso não comprova ausência de inativos.
- Filtro apresenta toggle Ativos Sim/Não; a implementação deverá conferir seu efeito real e pesquisar também inativos, quando necessário, para não confundir registro oculto com exclusão.
- Adicionar abre modal de CPF obrigatório, com `CPF`, `btnProcurarPessoa`, Fechar e Procurar.
- Consulta com CPF sintético matematicamente válido `990.000.001-30` apresentou: **`Nenhum possível cadastro encontrado. Deseja realizar um novo cadastro?`**. Confirmar Sim abriu o formulário, sem gravar pessoa/conselheiro.
- Formulário `form_conselheiro`, título `Cadastrar Conselheiro Tutelar`; botões `btnSalvar` e `btnVoltar`.
- CPF é herdado da consulta e fica readonly. Telefone não é preenchido na inclusão: aviso **`Para cadastrar os telefones, é necessário salvar o conselheiro.`**
- Estado inicial de Conselheiro presidente: Não. Campo Ativo não apareceu no formulário novo.
- Inspeção encerrada por Voltar; retorno à consulta com `<Nenhum resultado>`. Nenhuma massa criada.

### Campos observados

Obrigatórios identificados pela classe `obrigatorio`/asterisco vermelho:

| Campo | ID | Observação |
| --- | --- | --- |
| Nome | `PessoaNome` | Máximo 200 caracteres; nome QAAUTO. |
| Sexo | `PessoaSexo` | Select2: Masculino, Feminino, NaoInformado. |
| CPF | `PessoaCPF` | Readonly; vem do modal anterior. |
| Data Nascimento | `PessoaDataNascimento` | Usar data válida, idade com folga acima de 21 anos. |
| Email | `PessoaEmail` | Sintético; não usar contato pessoal nem disparar mensagens. |
| CEP | `PessoaCep` | Possui botão de busca `btnBuscarCep`; dependência a verificar. |
| Logradouro | `PessoaLogradouro` | Texto QAAUTO quando editável. |
| UF | `PessoaEstado` | Select2 de estados. |
| Cidade | `PessoaCidade2Id` | Inicialmente sem opções; depende de UF. |
| Bairro | `PessoaBairroId` | Inicialmente sem opções; dependência a confirmar. |

Opcionais: RG (`RG`, máximo 15), presidente (`ConselheiroPresidente`), complemento (`PessoaComplemento`), número (`PessoaNumero`, máximo 10), observações (`Observacao`, máximo 500). Preencher obrigatórios e opcionais informados no JSON; observação QAAUTO pode servir de identificação adicional da execução. Não alterar presidência.

## 3. Referências e questões ainda não executadas

Lidos: `CLAUDE.md`, `.claude/skills/playwright-e2e-engineer/SKILL.md`, referências `arquitetura-projeto.md` e `receitas-sge.md`; factory/actions de Atividades de AEE, helper CPF e configuração Playwright. Antes de implementar, ler templates e configuração/spec do modelo, sem copiar suas dívidas técnicas.

Pesquisa local não encontrou implementação de Conselheiros em `src/` ou `tests/`. Conferir novamente colisões e exports antes de criar arquivos.

Referência consultada exclusivamente pelo MCP `sue_regras_negocio`: documento `conselho-tutelar/conselheiros` (situação: página de referência; levantamento estático, não teste de UI).

Esse documento informa, mas ainda depende de confirmação no ambiente:

- Busca por nome/CPF, filtro inicial de ativos e escopo municipal conforme perfil.
- Idade acima de 21 anos; CPF não pode pertencer a pessoa/conselheiro existente. Não reaproveitar pessoa existente nesta automação.
- Município precisa coincidir com o de alguma escola do tenant; ao menos uma escola deve existir.
- Possível inclusão inativa pelo formulário, apesar do filtro inicial de ativos. Tratar explicitamente a consulta de inativos; não alterar o resultado esperado para esconder desaparecimento da grade.
- Cadastro representa identidade do conselheiro; mudanças de Ativo podem sincronizar usuário vinculado. Não criar credenciais, permissões ou acesso adicional como parte do cenário. Se isso for imposto pelo fluxo, parar para decisão.
- Referência não encontrou ação de exclusão utilizável; método de serviço descrito não confirmou remoção. Ausência de Excluir no formulário novo não prova ausência na edição. Não foi aberto registro salvo, logo esse ponto continua pendente.

Mensagens de salvar, duplicidade e excluir, endpoints efetivos, linha persistida, limites sem maxlength, endereço válido do tenant e efeitos de cadastro não foram exercitados. Não inventar seletores ou declarar esses comportamentos confirmados.

## 4. Execução após aprovação

### Fase 0 — Preparação

1. Criar `2026-11-12-automacao-conselheiros-progresso.md`, com painel de fases, manifesto, evidências e massa.
2. Reutilizar a aba do navegador interno; conferir sessão e perfil. Se expirar, pedir login manual sem ler credenciais.
3. Executar `npx tsc --noEmit` para linha de base.
4. Conferir dependências de endereço/município pela UI; não criar escola, cidade, bairro ou pessoa de apoio por conta própria.

### Fase 1 — Completar exploração antes de escrever código

1. Inspecionar consulta com e sem filtro de ativos; mapear pesquisa exata, paginação e abertura de cadastro.
2. Escolher endereço coerente com escola do tenant; verificar cascata UF → Cidade → Bairro e o comportamento do CEP. Esperar opções/estado reais, sem sleeps.
3. Montar nome `QAAUTO Conselheiro <sequência>`, CPF sintético válido sem colisão, nascimento adulto, email sintético e demais obrigatórios. Não converter pessoa existente.
4. Verificar previamente se há controles de envio, credenciais ou permissão; mantê-los fora do fluxo. Se criação de acesso adicional for obrigatória, parar.
5. Criar **um** registro exploratório somente após aprovação deste plano, capturando feedback e ID/combinação imediatamente após confirmação de gravação. Não iniciar uma segunda criação antes de esclarecer a possibilidade de remoção.
6. Após Salvar, voltar pelo menu Conselho Tutelar > Conselheiros e pesquisar o CPF criado. Aguardar a grade atualizada e exigir exatamente uma linha com o CPF completo e o nome esperado, considerando a apresentação em maiúsculas. Aplicar esse critério também quando aparecer o erro de conexão após salvar. A abertura da ficha para investigar exclusão é uma etapa posterior.
7. Somente com remoção viável: verificar duplicidade de CPF e nome com massa própria, registrar mensagens exatas e remover todas as criações exploratórias. Separar regras de nome e CPF quando necessário.
8. Mapear requests provocados pela UI com as capacidades disponíveis; se o navegador interno não expuser rede, usar estados observáveis confirmados, sem adivinhar endpoints ou trocar de navegador sem instrução.

### Fase 2 — Implementação, se o CRUD for viável

Arquivos propostos (slug singular `conselheiro`):

- `src/factories/conselheiro.factory.ts`
- `src/helpers/navigation/conselheiro.navigation.ts`
- `src/actions/criar-conselheiro.action.ts`
- `src/actions/excluir-conselheiro.action.ts`
- `tests/Conselho Tutelar/conselheiros/conselheiro_config.ts`
- `tests/Conselho Tutelar/conselheiros/dados_conselheiro.json`
- `tests/Conselho Tutelar/conselheiros/dados_exclusao_conselheiro.json`
- `tests/Conselho Tutelar/conselheiros/criar_conselheiro_action.spec.ts`
- `tests/Conselho Tutelar/conselheiros/excluir_conselheiro_action.spec.ts`
- `tests/Conselho Tutelar/conselheiros/criar_e_excluir_conselheiro_action.spec.ts`
- Exports nos índices existentes de actions, navigation e factories; plano e progresso.

Exatamente três specs, sem README, fixture ou gerador novo. CPF válido via helper existente ou composição determinística local justificada; não alterar o helper compartilhado. JSON controla quantidade (vazio = 1), dados pessoais sintéticos e dados de apoio. Não registrar CPF de pessoa real.

Separar dados, navegação e orquestração. Usar locators observados, escopo `#main` e `getByRoleSge` quando necessário. A action de criação comprova persistência pela pesquisa descrita no passo 6. A ausência ou ambiguidade da linha faz o teste falhar. A exclusão individual exige identificação exata antes da ação e nova pesquisa que também considere os inativos para comprovar a remoção.

O ciclo acumula somente registros confirmados desta execução, limpa em ordem reversa em `finally` e relança erros com `AggregateError`. Preservar identidade do registro mesmo se a validação após salvar falhar. Nenhuma pré-limpeza de QAAUTO alheio.

### Fase 3 — Validação

Comandos separados; interromper na primeira falha e investigar evidências. E2E fora do ambiente restrito, conforme orientação do responsável já validada na tarefa anterior, com login próprio do runner pelo helper existente; exploração permanece no navegador interno.

```powershell
npx tsc --noEmit
npx playwright test "tests/Conselho Tutelar/conselheiros/criar_conselheiro_action.spec.ts" --project=regression --workers=1 --retries=0
```

Atualizar o JSON de exclusão com a identificação exata retornada pela criação. Em seguida:

```powershell
npx playwright test "tests/Conselho Tutelar/conselheiros/excluir_conselheiro_action.spec.ts" --project=regression --workers=1 --retries=0
npx playwright test "tests/Conselho Tutelar/conselheiros/criar_e_excluir_conselheiro_action.spec.ts" --project=regression --workers=1 --retries=0
npx playwright test "tests/Conselho Tutelar/conselheiros/criar_e_excluir_conselheiro_action.spec.ts" --project=regression --workers=1 --retries=0
```

Zero testes, skip/fixme ou aprovação por retry não contam. Não rodar suíte inteira. Não usar waitForTimeout, XPath, force sem evidência, first/nth arbitrários, catch silencioso ou enfraquecer assertions. Nenhum módulo pronto será alterado além de exports.

### Fase 4 — Entrega

Registrar arquivos, comandos/resultados, peculiaridades, diferenças entre referência e UI, apoio usado, identificação e destino de cada massa e limitações. Concluído somente após criação, exclusão e dois ciclos passando e massa própria removida. Se exclusão não existir, entregar diagnóstico e aguardar novo escopo, sem declarar CRUD concluído.

## 5. Critérios de parada

Parar e consultar o responsável se: sessão/permissão impedir acesso; município/dados de apoio não puderem satisfazer regra do tenant; só for possível converter pessoa preexistente; não houver exclusão efetiva; ocorrer criação obrigatória de acesso, envio ou efeito que não possa ser desfeito; for necessário alterar módulos compartilhados; duas correções fundamentadas da mesma falha não produzirem avanço.

Mensagem: `BLOQUEIO — Conselheiros / <etapa>`, com fato, evidência, tentativas, massa remanescente e decisão necessária. Não contornar por API, banco, rota interna ou inativação apresentada como exclusão.

## 6. Aprovação solicitada

Aprovar este plano autoriza a próxima fase de exploração com **um conselheiro QAAUTO sintético**, incluindo o risco explícito de ele permanecer na homologação caso a exclusão não esteja disponível, e a implementação/validação do CRUD somente se a remoção for confirmada. Nenhuma criação de usuário, credencial ou concessão de acesso adicional está incluída.

Se a remoção não for viável, nenhuma spec de exclusão/ciclo será escrita antes de nova decisão do responsável.
