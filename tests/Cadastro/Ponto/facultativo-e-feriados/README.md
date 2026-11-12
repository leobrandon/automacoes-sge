# Cadastro > Ponto > Facultativo e Feriados

Menu: `Cadastro > Ponto > Facultativo e Feriados` (tela "Consulta de Feriados/Facultativo").

## Specs

| Arquivo | O que faz |
| --- | --- |
| `criar_facultativo_feriado_action.spec.ts` | Cria `quantidade` registros QAAUTO e **mantém** no ambiente. |
| `excluir_facultativo_feriado_action.spec.ts` | Exclui por `dados_exclusao_facultativo_feriado.json`: individual (descrição exata) ou lote (`excluirTodasQAAUTO: true`). |
| `criar_e_excluir_facultativo_feriado_action.spec.ts` | Ciclo completo: cria, consulta e exclui só o que a própria execução criou. |
| `facultativo_feriado_factory.spec.ts` | Unitário da factory/config (projeto `unit`, não acessa o SGE). |

## JSONs

- `dados_facultativo_feriado.json`: `quantidade` (vazio = 1), `descricao` (base `QAAUTO ...`; vazio = `QAAUTO Feriado` ou `QAAUTO Facultativo`), `data` (DD/MM/AAAA da primeira data; vazio = `01/03/2030`), `facultativo` (`true`/`false`).
- `dados_exclusao_facultativo_feriado.json`: `descricao` exata a excluir, ou `excluirTodasQAAUTO: true` (só aceita o termo `QAAUTO`).

## Comportamento da tela observado

- Campos: Descrição (obrigatório, **máx. 250 caracteres**, sem `maxlength` no HTML), Data (datepicker `#Data`), checkbox Facultativo (marcado = facultativo; desmarcado = feriado) e "Especificar" (Contrato/Lotação + Unidades; em branco = todas, não usado pela automação).
- O SGE rejeita **descrição repetida** e **data repetida** ("Já existe um feriado cadastrado com a data/descrição ..."). Por isso a data de cada registro é `data base + (sequência - 1)` dias, e a action escolhe a primeira sequência cuja descrição ainda não existe na consulta (nada é excluído para isso). A consulta não filtra por data e a descrição livre não garante data livre (ex.: `QAAUTO Facultativo 1` e `QAAUTO Feriado 1` disputam `01/03/2030`). Por isso, quando o SGE recusa com "Já existe um feriado cadastrado com a data/descrição ...", a action registra o aviso e tenta a próxima sequência (até 30 tentativas). Qualquer outra mensagem de validação falha o teste.
- Salvar volta sozinho para a consulta (sem diálogo de sucesso).
- A grade só tem Descrição e Data: **sem lixeira**. Clicar na descrição abre "Editar Feriado/Facultativo", onde estão Salvar, **Excluir** e Voltar; Excluir pede "Tem certeza que deseja excluir?" → "Sim" e volta para a consulta.
- A pesquisa filtra por descrição (trecho), **não por data**.
- A grade não mostra o indicador Facultativo; a action confere pela tela de edição.
- A exclusão em lote processa a primeira página da pesquisa `QAAUTO` repetidamente (10 por página); registros que falharem não são reprocessados.

## Ambiente

O POST de login do SGE chegou a levar ~22 s (padrão do `loginSge` é 20 s). As specs passam `timeout: 60000` ao `loginSge`. Os dados do tenant (ex.: unidades) dependem do ambiente em `BASE_URL`.
