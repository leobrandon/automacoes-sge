# Planejamento: automação de Sala de Aula (Infraestrutura > Sala de Aula)

Status: **planejado, não implementado**. A exploração foi somente leitura na homologação
(nenhum registro foi criado ou alterado; só um "Salvar" com formulário vazio para ver as validações).
Itens marcados com **[VERIFICAR]** dependem de criar registros QAAUTO e ficam para o início da execução.

## 1. Entregáveis

Pasta de testes: `tests/Infraestrutura/sala-de-aula/` (espelha o menu, como Dependência Física).

| Arquivo | Função |
| --- | --- |
| `criar_sala_de_aula_action.spec.ts` | Cria `quantidade` salas e as mantém (conferência manual). |
| `excluir_sala_de_aula_action.spec.ts` | Exclui por JSON: individual exato (descrição + escola) ou lote QAAUTO. |
| `criar_e_excluir_sala_de_aula_action.spec.ts` | Ciclo completo repetível; limpa só o que a execução criou. |
| `sala_de_aula_config.ts` | Lê e valida os dois JSONs. |
| `dados_sala_de_aula.json` | `quantidade` + campos opcionais (vazio = valor padrão). |
| `dados_exclusao_sala_de_aula.json` | `excluirTodasQAAUTO`, `termoGeral`, `descricao`, `escola`. |

Código de apoio em `src/` (um arquivo por camada, exports nos três `index.ts`):
`factories/sala-de-aula.factory.ts`, `helpers/navigation/sala-de-aula.navigation.ts`,
`actions/criar-sala-de-aula.action.ts`, `actions/excluir-sala-de-aula.action.ts`.
Sem README, sem teste unitário de factory (preferência registrada).
Nenhum nome colide com o código atual (busca por `Sala` em `src/` sem resultados).

## 2. O que a tela mostra

**Navegação**: menu Infraestrutura > Sala de Aula (link "Sala de Aula"; escopar ao item Infraestrutura).
Rota da consulta `/sala` (GET); grade em `POST /sala/indexgrid`; título "Consulta de Salas de Aula".

**Consulta**: busca `#searchTerm`, botão `#btnSubmitSearch`, filtros (`#btnFiltros`), Adicionar,
Exportar (`#btnExportar`), Imprimir (`#btnImprimir`). Colunas: (oculta), Descrição, Capacidade,
Área base (m²), Volume (m³), Largura da Porta, Número de Janelas, Climatização, Acessível, Ativo, Escola.
Os filtros são *selects* (DRE, Escola, Climatização, Largura da porta, Acessível, Ativo), todos vazios por
padrão, com `adicional` = `{}`; ao contrário de Dependência Física da Escola, não há toggles que
restrinjam a lista ao abrir. A consulta estava vazia na homologação.

**Formulário** (`#form_sala`, "Adicionar Sala de Aula"; botões Salvar e Voltar; sem abas):

| Campo | Id | Tipo / limite | Obrigatório |
| --- | --- | --- | --- |
| Escola | `EscolaId` | Select2 (5 escolas + DRE) | sim |
| Número da sala | `NumeroSala` | texto numérico, 1 a 999, maxlength 3 | asterisco **[VERIFICAR]** |
| Descrição | `Descricao` | texto, maxlength 100 | sim |
| Capacidade de Alunos | `CapacidadeDeAlunos` | inteiro, maxlength 11 | não |
| Largura / Comprimento / Pé-direito | `Largura`, `Profundidade`, `PeDireito` | 1 casa decimal, em m | não |
| Área da base / Volume | `Area`, `Volume` | numérico | não |
| Largura da Porta (cm) / Nº de Janelas | `LarguraDaPorta`, `NumeroDeJanelas` | maxlength 3 | não |
| Ativo? | `Ativo` | toggle, **ligado** por padrão | não |
| Quantidade de alunos | `QuantidadeAlunos` | somente leitura (calculado) | n/a |
| Dentro do prédio escolar? | `DentroDoPredioEscolar` | toggle, ligado por padrão | não |
| Com acessibilidade? | `ComAcessibilidade` | toggle, desligado | não |
| Climatização | `ListaClimatizacao` | Select2 **múltiplo**; opções Ar-condicionado, Aquecedor, Climatizador, Ventilador, "Não há" (exclusiva) | **sim** |
| Qtde de ares-condicionados / aquecedores / climatizadores / ventiladores | `QuantidadeDeAresCondicionados` etc. | aparecem conforme a climatização escolhida | não (opcional; a automação preenche o de ares-condicionados) |
| Com cantinho para leitura? | `ComCantinhoParaLeitura` | toggle, desligado | não |
| Controle da alimentação independente? | `ControleIndependente` | toggle, desligado | não |
| Localização | `LocalId` | Select2; **sem opções** hoje | sim, só se o controle independente estiver ligado |
| Fonte de energia elétrica | `ListaFonteEnergiaEletrica` | Select2 múltiplo (4 opções, "Não há energia elétrica" exclusiva) | sim, só se o controle independente estiver ligado |

**Validação observada** (Salvar com tudo vazio): alerta "Atenção! Verifique os dados informados." e mensagens
"Escola é obrigatório.", "Descrição é obrigatório." e "Climatização é obrigatório." O Número da sala não foi
recusado vazio, apesar do asterisco.

Regra do projeto: os obrigatórios são os com asterisco vermelho. Localização e Fonte de energia só são
exigidas com o controle independente ligado; o fluxo padrão não usa esse cenário.

## 3. Modelo de dados (factory)

- `descricao` = `QAAUTO <base> <sequência>`; base padrão "Sala de Aula"; máx. 100 caracteres.
- `escola`: padrão `ESCOLA MUNICIPAL CULTURA` (dado do tenant, sobrescrevível no JSON).
- `climatizacao`: lista; padrão `['Ar-condicionado']` (decisão do usuário). Ao escolher Ar-condicionado aparece o
  campo "Qtde de ares-condicionados" (`QuantidadeDeAresCondicionados`, maxlength 5, numérico). Decisão do usuário:
  é opcional, mas a automação o preenche. A factory ganha `quantidadeAresCondicionados` com padrão 1 e a action o
  preenche quando Ar-condicionado estiver na lista; o JSON pode trocar o valor. Conferir o valor na grade/edição.
- `numeroSala`: padrão = sequência efetiva (1 a 999). Só vira obrigatório no código se a exploração mostrar que o SGE exige; caso contrário só preenche quando o JSON informar.
- Opcionais (`capacidade`, `largura`, `comprimento`, `peDireito`, `area`, `volume`, `larguraPorta`, `numeroJanelas`,
  toggles) só são preenchidos se o JSON os informar; vazio significa não mexer no campo.
- `quantidade` (registros) vazia vale 1.
- `isSalaDeAulaQAAuto(descricao)`: `^QAAUTO\b`.

## 4. Identificação do registro e duplicidade

A chave de busca será Descrição + Escola (a coluna Escola da grade provavelmente traz "NOME - código", como em
Dependência Física da Escola **[VERIFICAR]**).

Duplicidade (**[VERIFICAR]** na exploração, criando e excluindo registros QAAUTO): testar (a) mesma descrição e
mesmo número na mesma escola, (b) mesmo número com descrição diferente, (c) mesma descrição em escolas
diferentes. Conforme o resultado: se aceitar, usar `proximaSequenciaLivre...` e exigir `toHaveCount(1)`; se
recusar, a action trata a mensagem (como em Dependência Física da Escola).

## 5. Desenho das camadas

**Navegação** (modelo: Períodos / Dependência Física): `navegarParaConsultaSalaDeAula` pelo menu com
`waitForResponse` em `GET /sala`; `navegarParaAdicionar...`; `voltarParaConsulta...`; `pesquisarSalaDeAula`
(POST `/sala/indexgrid`, marcando a tabela anterior); `linhaSalaDeAula(descricao, escola)`;
`abrirEdicaoSalaDeAula` (clicar na descrição; a grade não tem lixeira, **[VERIFICAR]**);
`proximaSequenciaLivreSalaDeAula`; `confirmarExclusaoSalaDeAula` ("Tem certeza que deseja excluir?" / "Sim").
Como a consulta de Dependência Física da Escola tem título parecido, aqui o título "Consulta de Salas de Aula"
é único, mas confirmar o heading em `#main` com `getByRoleSge`.

**Criar**: preencher Escola (Select2), Descrição, Climatização (`select2.select(..., { isMultiple: true })`,
uma chamada por opção), opcionais do JSON; Salvar; esperar sucesso ou erro (`.alert-danger` /
`.field-validation-error`) com mensagem acionável; voltar à consulta; provar na grade (1 linha, climatização e
capacidade quando informadas); reabrir e conferir os campos gravados, inclusive os toggles e o campo calculado
"Quantidade de alunos" quando houver área e capacidade **[VERIFICAR]**.

**Excluir**: pesquisar, exigir exatamente 1 linha, abrir, "Excluir", confirmar, esperar o aviso de sucesso e a
consulta, e provar ausência. Lote: percorre a grade e só remove descrição `QAAUTO`; falhas viram resultado, não
exceção silenciosa.

**Specs**: copiar a estrutura de Períodos / Dependência Física (login com `timeout: 60000`, `try/finally` com
exclusão em ordem reversa e `AggregateError`).

## 5.1 Config e JSONs

```json
// dados_sala_de_aula.json
{ "quantidade": 2, "escola": "", "descricao": "", "climatizacao": [], "capacidade": "", "...": "" }
// dados_exclusao_sala_de_aula.json
{ "excluirTodasQAAUTO": true, "termoGeral": "QAAUTO", "descricao": "", "escola": "" }
```

`climatizacao` aceita lista (valida contra as 5 opções; "Não há" não combina com as demais). Exclusão em lote
limitada ao termo `QAAUTO`; individual exige descrição exata QAAUTO e escola.
Decisão do usuário: `excluirTodasQAAUTO` começa em `true`, como nos outros módulos.

## 6. Pontos a verificar no início da execução (com registros QAAUTO)

1. Mensagem de sucesso ao salvar e ao excluir; texto exato (já vimos que os avisos do SGE variam em acento).
2. Número da sala: obrigatório de fato? único por escola?
3. Duplicidade (itens 4a a 4c).
4. Campos de quantidade da climatização: "Qtde de ares-condicionados" é opcional (decisão do usuário) e será preenchido; confirmar só se as demais quantidades (aquecedor, climatizador, ventilador) se comportam igual e se o valor é gravado e recarregado na edição. Comportamento da opção exclusiva "Não há".
5. A pesquisa por texto da consulta localiza descrição e escola? (Em Dependência Física da Escola não localizava.)
6. Colunas e formato da linha na grade (índice da célula Descrição, formato da Escola, coluna Ativo).
7. Edição: título "Editar Sala de Aula", botão Excluir, valores recarregados (comparar com o que a grade mostra; em
   Dependência Física da Escola o campo Tipo mostrava o valor errado na edição).
8. Exclusão de sala vinculada a turma: bloqueio e mensagem (relevante se turmas QAAUTO usarem salas).
9. Limites: maxlength de Descrição (100) e Número (3), valores fora de faixa, inteiros vs decimais.
10. Efeito do toggle Ativo = Não na listagem (se alguma tela filtra por Ativo).

## 7. Cenários além do básico (opcionais, só se o usuário pedir)

- Controle de alimentação independente: **fora do escopo** (decisão do usuário). Exigiria Localização (sem opções hoje; seria cadastro de apoio) e Fonte de energia.
- Edição de sala existente (como `editar_documento_curricular_action`).
- Validação de campos obrigatórios (como `validacao_modal_turma_action`).

## 8. Riscos e armadilhas conhecidas (lições dos módulos anteriores)

- Conferir se a grade aberta pelo menu tem filtros padrão que escondem registros; nesta tela os filtros são selects
  vazios, mas confirmar com um registro real.
- Não confiar na pesquisa por texto sem testá-la; ter plano B (grade completa com 100 por página).
- Asteriscos nem sempre refletem a validação do servidor; basear a lista de obrigatórios também no erro real.
- Avisos do SGE mudam de redação e acentuação entre módulos; usar regex tolerante no que não for contrato.
- Climatização é Select2 múltiplo com opção exclusiva; usar o helper com `isMultiple` e conferir as tags.
- Não usar o navegador interno com sessão logada enquanto o Playwright roda (houve erro de conexão no
  navegador após execuções; causa não confirmada).
- O conteúdo do dropdown de Escola depende do tenant; falhar com mensagem listando as opções.

## 9. Validação (critérios de aceite)

1. `npx tsc --noEmit` sem erros.
2. `criar_sala_de_aula_action.spec.ts` passa e deixa as salas QAAUTO na grade.
3. `excluir_sala_de_aula_action.spec.ts` (lote) remove essas salas e a grade fica sem QAAUTO.
4. `criar_e_excluir_sala_de_aula_action.spec.ts` passa **duas vezes** em comandos separados, com
   `--workers=1 --retries=0`.
5. Relato final: arquivos, pré-condições (escola do tenant), duplicidade observada, achados de produto, massa
   QAAUTO remanescente (esperado: nenhuma).

## 10. Ordem de execução sugerida

1. Explorar com registros QAAUTO (itens da seção 6), no navegador, e excluí-los.
2. Escrever, em uma única passada, factory, navegação, as duas actions, config, JSONs e os 3 specs, mais os exports.
3. Rodar `tsc`, criar, excluir e o ciclo duas vezes; corrigir pela evidência.
4. Relatar achados de produto (qualquer comportamento estranho da tela).

## 11. Decisões do usuário (resolvidas)

- Escola padrão: `ESCOLA MUNICIPAL CULTURA`.
- Climatização padrão: `Ar-condicionado`, com "Qtde de ares-condicionados" opcional, mas preenchido (padrão 1).
- Cenário de controle de alimentação independente: não incluir.
- `excluirTodasQAAUTO`: `true`.

Sem perguntas em aberto; a próxima etapa é a execução (seção 10), quando o usuário pedir.
