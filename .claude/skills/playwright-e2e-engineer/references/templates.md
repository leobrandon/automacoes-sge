# Esqueletos para uma entidade nova

Ponto de partida, **não** substituto da exploração: todo locator, texto de menu,
rótulo, rota e mensagem abaixo é placeholder (`<...>`) e deve vir da UI observada.
Copie a estrutura de Atividades de AEE para detalhes; aqui estão só as formas.

## `dados_<entidade>.json` e `dados_exclusao_<entidade>.json`

```json
{ "quantidade": 1, "descricao": "" }
```

```json
{ "excluirTodasQAAUTO": false, "termoGeral": "QAAUTO", "descricao": "" }
```

Valores preenchidos substituem a factory; vazios geram dado válido; `quantidade`
vazia ⇒ 1. Exclusão geral exige `excluirTodasQAAUTO: true` deliberado.

## Factory

```ts
export const OPCOES_X = ['...'] as const;
export interface XData { descricao: string; /* demais campos */ }
export type BuildXOptions = Partial<XData>;

export function buildX(options: BuildXOptions = {}, sequencia = 1): XData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência deve ser um inteiro positivo.');
  }
  const base = options.descricao?.trim() || 'QAAUTO <nome semântico>';
  if (!/^QAAUTO\b/i.test(base)) throw new Error('A descrição deve começar com QAAUTO.');
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > <limite_do_campo>) throw new Error('Descrição acima do limite.');
  return { descricao /* , ...padrões */ };
}
export const isXQAAuto = (d: string) => /^QAAUTO\b/i.test(d.trim());
```

## Config da spec

Funções `lerConfiguracaoCriacaoX()` e `lerConfiguracaoExclusaoX()` que leem o JSON
de `__dirname`, validam tipo/enum com mensagens claras e rejeitam
`excluirTodasQAAUTO` com termo diferente de `QAAUTO`. Copie
`atividade_aee_config.ts` e troque campos.

## Navegação

`navegarParaConsultaX`, `navegarParaAdicionarX`, `pesquisarX(page, termo)`,
`linhaX(page, texto)`, `confirmar...` conforme as receitas em `receitas-sge.md`.
Cada espera é por estado observável (resposta armada antes do clique, título,
tabela, loader).

## Action de criação

```ts
export async function criarX(page: Page, options: BuildXOptions = {}, sequencia = 1) {
  const dados = buildX(options, sequencia);
  await navegarParaAdicionarX(page);
  // preencher pelos controles visíveis; confirmar valores quando houver dependência
  const salvar = getByRoleSge(page.locator('#main'), 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();
  await confirmarAviso(page, 'Ok');
  await pesquisarX(page, dados.descricao);
  await expect(linhaX(page, dados.descricao)).toHaveCount(1);   // persistência
  return { ...dados, url: page.url() };
}
```

## Action de exclusão

Recusa alvo sem `QAAUTO`; pesquisa; exige `toHaveCount(1)` e primeira célula
`toHaveText(exato)`; clica na lixeira da linha; confirma; pesquisa de novo e exige
`toHaveCount(0)`. Versão em lote: percorre a grade e a paginação, só remove
descrições `QAAUTO`, registra falhas por item e não engole erros.

## Spec de ciclo completo

Siga "Ciclo completo: padrão obrigatório" em `arquitetura-projeto.md` (`setTimeout`, loop, `try/finally`, ordem reversa, `AggregateError`).

## Teste unitário da factory

```ts
test('acrescenta a sequência ao nome configurado', () => {
  expect(buildX({ descricao: 'QAAUTO Base' }, 3).descricao).toBe('QAAUTO Base 3');
});
test('rejeita sequência inválida e descrição sem QAAUTO', () => {
  expect(() => buildX({}, 0)).toThrow();
  expect(() => buildX({ descricao: 'Sem prefixo' }, 1)).toThrow();
});
```

## Checklist de entrega por entidade

- [ ] factory + teste unitário `*_factory.spec.ts` verde (`unit`)
- [ ] navegação + actions criar/excluir exportadas em `src/actions/index.ts`
- [ ] config + dois JSONs ao lado das specs
- [ ] specs `criar_*`, `excluir_*`, `criar_e_excluir_*` com sufixo `_action.spec.ts`
- [ ] duas execuções E2E independentes do ciclo completo, `--workers=1 --retries=0`
