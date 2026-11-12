# Receitas de interação no SGE

Padrões já resolvidos no projeto. Reutilize os helpers antes de escrever
interação nova. Cada receita cita onde está a implementação de referência.

## Escopo: `#main` e `getByRoleSge`

O conteúdo da página fica em `#main`, que pode estar com `aria-hidden="true"`
mesmo visível; por isso `getByRole` normal não encontra nada. Use
`getByRoleSge(escopo, role, opts)` (`src/helpers/sge-locators.helper.ts`), que
passa `includeHidden: true`, e **sempre** confirme `toBeVisible()` antes de
interagir. IDs estáveis do formulário (`#main #Descricao`, `#Ativo`,
`#searchTerm`, `#btnSubmitSearch`) são aceitos quando não há papel/rótulo útil.
Diálogos SweetAlert ficam fora de `#main`: `page.getByRole('dialog')`.

## Menu lateral

Navegue por `nav` → link do grupo (ex.: Cadastro) → submenu (ex.: Ensino) →
destino. Os grupos são colapsáveis: verifique se o destino já está visível antes
de clicar no pai para não fechá-lo. Ao clicar no destino, arme
`page.waitForResponse` (GET da rota da consulta, `response.ok()`) **antes** do
clique e depois aguarde título, tabela e campo de busca. Implementação:
`navegarParaConsultaAtividadeAee`.

## Botões só com ícone

"Adicionar" e a lixeira não têm texto acessível: no código são
`getByRoleSge(main, 'button', { name: '', exact: true })` e
`getByRoleSge(linha, 'link', { name: '', exact: true })`. Antes de usar, confirme
na exploração que há exatamente um candidato no escopo; se houver mais, escope
por linha/container, não por `.nth()`.

## Grade: pesquisar e localizar linha

Preencha `#searchTerm`, arme `waitForResponse` do `.../indexgrid?searchTerm=<termo>`
e clique em `#btnSubmitSearch`; depois aguarde loaders e a tabela. A linha é
`#main table tbody tr:visible` filtrada pelo texto completo. Prove criação com
`toHaveCount(1)` e exclusão com `toHaveCount(0)` após nova pesquisa. Cuidado: um
termo que é prefixo de outro (`... 1` vs `... 10`) casa duas linhas; compare a
primeira célula com `toHaveText(exato)`.

## Loaders e diálogos

- `waitForSgeLoaders(page)` (`common.navigation.ts`) aguarda overlays/spinners; a variante da entidade também espera `.swal2-popup.swal2-loading` ocultar.
- Sucesso/confirmação: SweetAlert com botões `Ok`/`Sim`. Padrão: `page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Ok', exact: true }) })`, aguardar visível, clicar e aguardar oculto (`confirmarAvisoAee`, `confirmarExclusaoAee`).
- Diálogos jQuery UI (`.ui-dialog`) aparecem em fluxos de aluno (verifica aluno); trate-os no fluxo, não com Escape cego.

## Select2 (dropdown personalizado)

`select2.select(page, '#EscolaId', 'Texto', { exactMatch: true })`
(`src/helpers/select2.helper.ts`). Aceita o id do `<select>` e resolve
`#s2id_<id>`. Para selects dependentes, aguarde o campo filho habilitar/popular
depois de escolher o pai (opção disponível, não timeout). Multi: `isMultiple: true`.
O helper valida o texto escolhido; não adicione `force`.

### Pré-condição de dropdown de apoio (falhar rápido)

Antes de selecionar, abra o dropdown e leia as opções pelo estado visível, sem
esperar timeout pela opção:

```ts
async function exigirOpcaoDeApoio(page: Page, container: string, alvo: string, cadastro: string, automacao: string) {
  await page.locator(container).locator('.select2-choice').click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();                       // dropdown abriu
  const opcoes = drop.locator('ul.select2-results li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0); // lista resolvida
  const textos = (await opcoes.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  await page.keyboard.press('Escape');
  if (textos.length === 0) {
    throw new Error(`Nenhum(a) ${cadastro} cadastrado(a). Execute ${automacao} antes desta automação.`);
  }
  if (!textos.includes(alvo)) {
    throw new Error(`${cadastro} "${alvo}" não encontrado(a). Opções existentes: ${textos.join(' | ')}.`);
  }
}
```

Isto é forma, não código pronto: ajuste ao DOM observado e ao campo pai (aguarde o
filho popular após escolher o pai). Fechar o dropdown com `Escape` aqui é limpeza
de estado, não contorno de falha; a seleção real continua via `select2.select`.

## Cascatas, campos condicionais e telas de edição

Aprendido ao adaptar Turma e Aluno para o tenant de homologação:

- **Select2 em cascata não fica `disabled` enquanto carrega.** Esperar `:not(.select2-container-disabled)` passa na hora e o dropdown abre com 0 opções. Antes de cada filho, aguarde o `<select>` nativo ter opções: `expect.poll(() => page.locator('#FilhoId option').evaluateAll((o) => o.filter((x) => x.value !== '').length)).toBeGreaterThan(0)`, com mensagem que nomeie o campo e o cadastro de apoio (ver `exigirOpcaoDeApoio`). A exceção é um filho que o pai já preenche sozinho (ex.: Município com uma só opção): confira o valor escolhido antes de abrir o dropdown.
- **Formulário visível ≠ formulário pronto.** O SGE mostra o formulário antes de inicializar os Select2 e de preencher campos automáticos. Aguarde o primeiro Select2 (`#s2id_X:not(.select2-container-disabled) .select2-choice`) antes de preencher; se escolher o pai cedo demais, a cascata não dispara.
- **Campos pais ocultos.** Alguns tenants exigem escolher antes um campo de escopo (ex.: Diretoria Regional → Município → Escola em Turma). Se Escola/lista vier vazia, olhe o formulário preenchido manualmente antes de culpar o seletor, e exponha o campo opcional no `dados_*.json`.
- **Campo condicional recarregado.** "Recebe escolarização em outro espaço" só aparece depois de escolher a Turma e o SGE pode zerá-lo ao recarregar. Reaplique o valor imediatamente antes de salvar (via UI se visível; o `<select>` oculto não aceita `selectOption`). Quando o save falhar com "Verifique os dados informados", leia as mensagens de validação de todas as abas e os campos com classe `error`/`invalid`: o alerta é genérico.
- **Salvar nem sempre volta para a consulta.** Em Aluno, depois de salvar o SGE fica em "Editar Aluno", cujo formulário parece um novo. Antes de um segundo cadastro, saia pelo botão Voltar e aguarde o título da edição sumir (timeout generoso: a consulta recarrega devagar).
- **Descrição/nome repetido é rejeitado** ("Já existe um registro cadastrado com esta descrição..."). Registros QAAUTO mantidos por execuções anteriores colidem com sequências que recomeçam em 1: derive o sufixo do relógio ou de um contador persistido.
- **Regras de domínio em dados gerados.** Idade/ano escolar, datas de corte etc. são validadas pelo SGE ("O aluno não tem idade suficiente para o ano escolar selecionado"); gere dados com folga em relação à regra, não no limite.
- **Rótulos que mudam entre telas.** O mesmo cadastro pode listar `NOME - 12345` numa tela e só `NOME` em outra; normalize antes de reaproveitar o texto.
- **Orçamento de tempo.** Fluxos longos (turma + N alunos) levam ~1-2 min por aluno; dimensione `test.setTimeout` por item, não só por teste.

## Select nativo sem `selectOption`

Quando o `<select>` é estilizado e `selectOption` não é adequado, o projeto usa
foco + `Home` + `ArrowDown` até o `option:checked` ter o texto desejado e valida
com `toHaveText` (`selecionarAtividadeAee`). Só use isso após confirmar na UI que
a interação normal falha; documente o motivo no comentário.

## Toggle Sim/Não

Leia o estado do `input` (`isChecked`), clique no `.toggle` do `label` só se
precisar mudar, e valide com `toBeChecked({ checked })` (`definirAtivo`).

## Datas

`datepicker.fill(page, '#Campo', 'DD/MM/AAAA')` (`datepicker.helper.ts`): preenche,
pressiona Tab, fecha o calendário flutuante e valida o valor. Formato inválido
lança erro. Datas relativas devem vir de função determinística, não de Faker solto.

## Dados gerados

`buildX(options, sequencia)`: base = valor do JSON ou padrão semântico da
entidade; prefixo `QAAUTO` obrigatório (erro se faltar); sufixo ` <sequencia>`;
valida limite de tamanho do campo. `fakeData` (`src/helpers/generators`) só quando
o campo exige dado realista (CPF: `gerarCpfValido`).

## Autenticação

`loginSge` para specs diretas; `auth.fixture.ts` (`paginaLogada`) para testes
baseados em fixture. Credenciais só de `process.env`. Nunca grave valores em
arquivos, logs ou resultados.
