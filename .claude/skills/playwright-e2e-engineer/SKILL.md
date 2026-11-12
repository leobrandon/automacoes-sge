---
name: playwright-e2e-engineer
description: >-
  Use quando o usuário pedir criar, implementar, converter casos manuais em,
  ampliar cobertura, corrigir, estabilizar ou investigar testes automatizados
  Playwright/E2E no projeto Ponto iD / SGE, inclusive specs, fixtures, helpers e
  Page Objects de teste. Inclui pedidos como automatizar um caso de teste,
  criar teste de cadastro ou adicionar cobertura automatizada, mesmo sem citar
  Playwright. Não se aplica a explicações ou comparações de ferramentas, revisão
  isolada de React, correção isolada de endpoints nem execução manual sem
  criação ou manutenção de automação.
---

# Playwright E2E Engineer — Ponto iD / SGE

Entregue automação baseada no fluxo real e nos padrões do projeto, executada,
corrigida e confirmada por **duas execuções E2E independentes passando**. Criar a
spec não conclui a tarefa.

Antes de editar, leia `CLAUDE.md`. Exemplos antigos no repositório contêm sleeps,
`catch` silencioso, XPath e `.nth()`; analise-os, não os copie
(ver "Dívidas conhecidas" em `arquitetura-projeto.md`).

## Mapa de referências (carregue só o que o passo exige)

| Quando | Leia |
| --- | --- |
| Criar entidade nova, decidir onde fica o código, nomear specs, rodar comandos, escolher ambiente | [references/arquitetura-projeto.md](references/arquitetura-projeto.md) |
| Interagir com menu, grade, modal, Select2, select nativo, toggle, data, `#main` | [references/receitas-sge.md](references/receitas-sge.md) |
| Escrever factory/config/action/spec do zero | [references/templates.md](references/templates.md) |
| Avaliar a própria skill | [references/evaluation.md](references/evaluation.md) (nunca em tarefas comuns) |

## Fluxo

1. **Entender** o resultado esperado, permissões, ambiente e pré-condições
   necessárias; não presuma configurações. Defina as assertions funcionais que
   provam o resultado (inclusive persistência). Para definir o ambiente-alvo,
   leia antes o módulo vizinho (mesmo menu pai; ex.: outro cadastro de
   Cadastro > Ensino) e `playwright.config.ts`. Se `CLAUDE.md` e esta skill
   divergirem, prevalece `CLAUDE.md`; reporte a divergência. O escopo é o que o
   usuário pediu (ex.: só o ciclo completo), não o checklist inteiro de
   `templates.md`.
2. **Preflight de acesso** (curto, sem explorar o fluxo todo): use a ferramenta de
   navegador disponível e abra o login oficial do ambiente-alvo
   (`<BASE_URL>/Acesso/Entrar`; ver ambiente em
   `arquitetura-projeto.md`).
3. **Explorar a UI uma vez** pelo fluxo necessário: navegação, campos,
   dependências assíncronas, mensagens e resultado. Após cada ação que muda a
   tela, inspecione o novo estado; não repita snapshots sem mudança. Divergência
   entre produto e requisito é documentada, nunca absorvida trocando o esperado.
4. **Localizar o padrão**: identifique o projeto Playwright (`playwright.config.ts`,
   `package.json`), comece por uma spec/módulo semelhante e siga só o que ele usa.
   Reutilize antes de criar; não invente APIs nem leia módulos sem relação.
5. **Implementar** (regras abaixo), com mudanças mínimas. Examine os dependentes
   antes de alterar helper/fixture/configuração compartilhada.
6. **Executar, investigar e confirmar** (seção própria).
7. **Relatar** (seção própria).

### Caminho rápido (cadastro CRUD simples)

Use quando o usuário indicar o módulo-modelo (ex.: "igual ao Horários") e descrever
adicionar/excluir. Meta: poucas chamadas, sem releitura.

1. **Leia só o modelo**: a navegação, as duas actions e a factory do módulo citado
   (e `index.ts`). Não releia `arquitetura-projeto.md`, `receitas-sge.md` nem
   `templates.md` se o modelo já cobre o padrão; abra-os só para interação nova
   (Select2 em cascata, datas, abas).
2. **Explore uma vez, no navegador interno já logado** (se o usuário disser que
   está logado; é a única forma de ver a tela sem digitar credenciais): `read_page`
   para localizar o botão Adicionar e **um** `javascript_exec` que devolva o HTML do
   `form` (ids, `maxlength`, selects, toggles, obrigatórios). Para descobrir o
   feedback de salvar/excluir, instale um `MutationObserver` que registre textos
   visíveis (`sucesso|atenção|erro|certeza`) e acione a ação, tudo na mesma chamada;
   o aviso do SGE costuma ser um toast que some em segundos. Crie e exclua apenas
   registros `QAAUTO` de exploração, e remova-os.
3. **Escreva todos os arquivos numa única mensagem** (chamadas `Write`/`Edit` em
   paralelo; sem heredoc de shell, que quebra com aspas). Pasta e nomes: copie o
   módulo vizinho; só depois confira colisões de nome com um `Grep`.
4. **Valide em poucos comandos**: `tsc --noEmit` + spec de criar + spec de excluir
   num mesmo `Bash`; depois o ciclo completo duas vezes num laço. Só investigue
   se algo falhar.
5. **Não gere** README nem teste unitário (fora do escopo pedido). Entregue só os
   3 specs (criar, excluir, criar+excluir) com config e JSONs.

**Campos obrigatórios = os que têm asterisco vermelho no label** (regra do
usuário). No DOM o asterisco vem da classe `obrigatorio` no `label` ou num `span`
dentro dele; liste-os no mesmo `javascript_exec` que despeja o formulário
(`[...form.querySelectorAll('.obrigatorio')]` e o `for` do label). A automação
preenche os obrigatórios por padrão e os demais só quando o JSON os informar.
Não pergunte ao usuário quais campos são obrigatórios.

**Duplicidade é responsabilidade da exploração, não do usuário**: durante a
exploração, cadastre dois registros `QAAUTO` com o mesmo nome e as mesmas
configurações, observe se o SGE aceita ou recusa (e a mensagem), e exclua ambos.
Se aceitar, use a primeira sequência livre (`proximaSequenciaLivre...`) e exija
`toHaveCount(1)` na exclusão; se recusar, trate a mensagem na action.

**Não pergunte** ambiente (vem do `.env`: use a variável do módulo vizinho),
campos obrigatórios (asterisco vermelho) nem duplicidade. O fluxo de salvar/excluir
o usuário informa quando for atípico; quando não informar, descubra na exploração.

Peça esclarecimento apenas se uma ambiguidade concreta impedir o avanço,
informando a tela/etapa e a decisão que falta. Antes, consulte requisito,
evidência da UI e padrões existentes.

### Bloqueio de infraestrutura

Se a ferramenta estiver indisponível ou a navegação retornar
`ERR_NETWORK_ACCESS_DENIED` (ou outro bloqueio de rede/ambiente): registre
código/mensagem e evidência, classifique como infraestrutura, **pare probes
equivalentes** e não mexa em acesso ou configuração para contornar. Não o
diagnostique como locator ou defeito do produto. Análise local de traces e
evidências já coletadas pode continuar; só edite código se elas confirmarem a
causa sem depender do estado atual da UI. Uma configuração local não comprova
disponibilidade nem sessão autenticada. Não invente locators nem declare validação
de UI que não observou. Retome somente após mudança concreta de acesso. Sem acesso, é permitido
entregar a parte verificável offline (factory, config, JSONs e teste `unit`),
informando claramente que navegação, actions e E2E ficaram sem observação e sem
validação.

## Regras de dados e interação

- Toda preparação e validação ocorre **pela UI visível**. Sem API/banco para criar
  massa; observar network para diagnóstico não autoriza mutação.
- Autentique com `loginSge`/fixture existente (única navegação por URL
  permitida); depois use menus, submenus, links e botões. Sem `page.goto` para
  rotas internas. Credenciais só de `process.env`; nunca em código, logs ou evidências.
- Dados criados usam o prefixo **`QAAUTO`**. Nome/descrição:
  `QAAUTO <nome semântico da entidade> <sequência>` (sequência inicia em 1).
  Sem timestamp, GUID ou código aleatório; preserve números que fazem parte do
  significado (ex.: ano escolar). Faker só quando o campo exigir dado realista.
- `dados_<entidade>.json` ao lado da spec: valores preenchidos substituem a
  factory, vazios geram dado válido, `quantidade` vazia vale `1`.
- Criação isolada **preserva** o registro (sem consulta prévia ou exclusão
  automática). Ciclo completo remove só os registros desta execução, inclusive a
  massa criada na exploração. Exclusão geral exige cenário explícito e
  `excluirTodasQAAUTO: true`; o prefixo `QAAUTO` não prova autoria — preserve
  massa de outra execução.

### Dados de apoio (pré-condições do tenant)

Quando o formulário depende de outro cadastro (ex.: uma turma escolhe uma
composição de ensino), o valor vem do tenant e é declarado no `dados_<entidade>.json`;
a automação **não** cria a cadeia de apoio por conta própria, a menos que o
cenário peça. A spec deve **falhar rápido e explicar**: ao abrir o dropdown e
encontrar a lista vazia (ou sem a opção pedida), lance um erro acionável em vez
de esperar o timeout. Distinga os casos na mensagem:

- nenhum registro de apoio: nomeie o cadastro e a automação a rodar antes
  (ex.: "Nenhuma Composição de Ensino cadastrada. Execute
  `criar_composicao_ensino_action` antes de criar a turma.");
- registros existem, mas não o valor do JSON: liste as opções encontradas;
- dropdown não abriu ou campo pai não carregou: é UI/dependência assíncrona, não dado.

O erro vai na própria falha (aparece no relatório e no trace), nunca só em
`console.log`; nunca vira `skip` nem `catch` que engole. Aplique em código novo;
não altere actions/helpers existentes só para isso. Receita em `receitas-sge.md`.

## Implementação e sincronização

- Ordem de locators: `getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`,
  `getByTestId` (se houver contrato), depois outros. IDs estáveis observados são
  válidos. Evite XPath, CSS profundo, classes visuais e `.nth()` arbitrário;
  resolva ambiguidade pelo contexto (linha, container, diálogo).
- Em `#main` use `getByRoleSge` e confirme `toBeVisible()` antes de interagir
  (detalhes em `receitas-sge.md`).
- Auto-wait e assertions web-first. Espere o estado observável: visibilidade,
  habilitação, URL, resposta esperada (armada **antes** da ação), loader ausente,
  texto ou grade atualizada. Sem `waitForTimeout` como sincronização.
- Preserve as assertions que provam o resultado funcional, inclusive persistência.
- Proibido para "fazer passar": `force: true` sem necessidade comprovada, sleeps
  arbitrários, timeouts enormes, retries novos, assertions removidas ou
  enfraquecidas, `catch` que engole falha, etapas puladas condicionalmente
  (`test.skip` para esconder falha). Exceção exige evidência e justificativa
  técnica explícita, mantém o resultado esperado e nunca autoriza retries ou
  aprovar falha real.

## Executar, investigar e confirmar

1. Descubra o comando real e o projeto que inclui a spec; rode **apenas o teste
   relevante** com `--workers=1 --retries=0` (comandos em `arquitetura-projeto.md`).
   Zero testes descobertos, `skip`, `fixme` ou falha esperada não são aprovação —
   corrija nome/projeto.
2. Se falhar, examine primeiro a evidência (erro/stack, trace, screenshot/vídeo,
   console, rede, DOM/accessibility tree, dados). Classifique: teste, produto,
   ambiente, dados ou configuração. Falha de rede é infraestrutura.
3. Formule uma hipótese específica, valide-a na evidência ou, se depender do
   comportamento da tela, pela UI enquanto houver acesso (em UI dinâmica, confira
   o estado do controle após a ação que dispara a dependência). Só então faça a
   menor correção. Se o produto falhar de fato, mantenha a assertion e reporte;
   não altere o produto sem pedido explícito.
4. Rode de novo o teste afetado. Não rode a suíte completa em busca de verde nem
   testes sem relação. Rode `unit` de factory/config quando a mudança os afetar;
   helper compartilhado exige só os consumidores pertinentes. Amplie apenas a
   pedido do usuário ou por instrução explícita do projeto.
5. Exija **duas execuções E2E independentes** passando: dois comandos separados
   (cada um com login próprio), mesmo projeto/ambiente/JSON, `--workers=1
   --retries=0`; a segunda não pode depender de estado, sessão ou dados da
   primeira. Se uma execução falhar e deixar massa própria, remova só o que ela
   criou (conhecido pela saída/nome) antes de repetir; nomes determinísticos
   (`... 1`) colidem com resíduo, e a colisão não é desculpa para pré-limpeza
   automática no teste. Teste `unit` de factory/config criado ou alterado faz
   parte da entrega. Passar só por retry não conta. Bloqueio
   real impede declarar aprovação. Duas execuções não provam ausência de flakiness.

## Conclusão e comunicação

Concluído somente com fluxo compreendido, padrões respeitados, código
implementado, falhas investigadas e duas execuções reais passando. Relate:

- arquivos alterados, cobertura e resultado esperado;
- fluxo e pré-condições observados, causas encontradas e correções;
- comandos/projetos executados, resultado de **ambas** as execuções e evidências;
- limitações, riscos e validações pendentes (incluindo massa `QAAUTO` que ficou).

Em bloqueio externo real (rede, credenciais/MFA, autorização, ambiente, requisito
indeterminável), diga o que foi concluído, a evidência e o que falta validar, e
peça intervenção só para a dependência inacessível. Use o terminal você mesmo
quando tiver acesso.

Não gere README nem outra documentação por módulo; peculiaridades de tela vão no
relato final. Não infle esta skill com detalhes de um único cenário. Esta
automação não autoriza criar/atualizar chamados nem planilhas.
