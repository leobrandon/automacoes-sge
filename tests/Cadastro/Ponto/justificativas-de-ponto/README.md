# Cadastro > Ponto > Justificativa

Menu: `Cadastro > Ponto > Justificativa` (tela "Consulta de Justificativa"). Regras de negócio: página
"Justificativas de Ponto" do catálogo SUE (`cadastros/ponto-justificativa`). É o cadastro dos **tipos** de
justificativa; não registra a ocorrência de um colaborador.

## Specs

| Arquivo | O que faz |
| --- | --- |
| `criar_justificativa_ponto_action.spec.ts` | Cria `quantidade` Justificativas QAAUTO e **mantém** no ambiente. |
| `excluir_justificativa_ponto_action.spec.ts` | Exclui por `dados_exclusao_justificativa_ponto.json`: individual (descrição exata) ou lote (`excluirTodasQAAUTO: true`). |
| `criar_e_excluir_justificativa_ponto_action.spec.ts` | Ciclo completo: cria, consulta, reabre para conferir persistência e exclui só o que a própria execução criou. |
| `justificativa_ponto_factory.spec.ts` | Unitário da factory/config (projeto `unit`, não acessa o SGE). |

## `dados_justificativa_ponto.json`

Vazio (`""`) ou omitido = padrão. Só `descricao` precisa começar com `QAAUTO`; a automação acrescenta ` <sequência>`.

- `descricao` (até 250; vazio = `QAAUTO Justificativa Ponto`), `sigla` (até 5; vazio = `QA<sequência>`, vale até a sequência 999).
- `codigo` (opcional, até 60): o SGE exige código único, então a automação grava `<codigo>-<sequência>`.
- `prazo` (opcional, só dígitos, até 4).
- `tipo`: `Não remunerada` (padrão do SGE) | `Remunerada` | `Abono`.
- `disponivelParaUnidades` (`Sim` padrão) e `disponivelNaPreFolha` (`Não` padrão): `Sim` | `Não`.

## Comportamento da tela observado

- Salvar exige Descrição e Sigla (sem sigla o SGE mostra "Atenção!" e não grava). Sucesso: aviso (toast) "Justificativa salva com sucesso." e **volta sozinho à consulta**; não há diálogo com botão Ok.
- O SGE **aceita descrição e sigla repetidas**. A action de criação escolhe a primeira sequência livre para manter conferência e exclusão sem ambiguidade; `excluir` falha se achar mais de um registro com o mesmo nome.
- A grade (Descrição, Código, Sigla, Prazo, Tipo, Disponível para as unidades) **não tem lixeira**: clicar na descrição abre "Editar Justificativa" (Salvar, Excluir, Voltar). Excluir pede "Tem certeza que deseja excluir?" → "Sim", mostra "Justificativa excluída com sucesso!" e volta à consulta.
- "Disponível na Pré-Folha" não aparece na grade; por isso a action reabre o registro para conferir tudo o que gravou.
- A consulta já traz registros do tenant (ex.: "Licença Paternidade", "FOLGA GERADA AUTOMATICAMENTE"); a automação só toca os que começam com `QAAUTO`.

## Ambiente

Ambiente de `BASE_URL`, como o módulo vizinho Horários. O login chegou a levar ~22 s; as specs passam `timeout: 60000` ao `loginSge`.
