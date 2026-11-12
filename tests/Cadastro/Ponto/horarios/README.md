# Cadastro > Ponto > Horários

Menu: `Cadastro > Ponto > Horários` (tela "Consulta de Horários"). Regras de negócio: página
"Horários de Ponto" do catálogo SUE (`cadastros/ponto-horarios`). O horário define período, tipo de
carga horária, jornada por dia da semana e opções de cálculo usadas por contrato, escala e folha de ponto.

## Specs

| Arquivo | O que faz |
| --- | --- |
| `criar_horario_action.spec.ts` | Cria `quantidade` Horários QAAUTO e **mantém** no ambiente. |
| `excluir_horario_action.spec.ts` | Exclui por `dados_exclusao_horario.json`: individual (descrição exata) ou lote (`excluirTodasQAAUTO: true`). |
| `criar_e_excluir_horario_action.spec.ts` | Ciclo completo: cria, consulta, reabre para conferir persistência e exclui só o que a própria execução criou. |
| `horario_factory.spec.ts` | Unitário da factory/config (projeto `unit`, não acessa o SGE). |

## `dados_horario.json`

Vazio (`""`) ou omitido = padrão do SGE (booleanos vazios valem `false`). Só `descricao` precisa começar
com `QAAUTO`; a automação acrescenta ` <sequência>`.

- **Cabeçalho:** `descricao` (vazio = `QAAUTO Horario`), `tipo` (`Mensal` | `Diária`), `colunaRefeicao` (`Saída 1 Entrada 2` … `Saída 4 Entrada 5`).
- **Aba Geral:** `cargaHorariaFixaEmHoras` (dígitos; só Mensal), `horarioFechamentoNoturno` (HH:mm; desabilitado com `horario24Horas`), `horario24Horas`, `habilitarBatidasPreAssinaladas`, `preencherFolgaEmBranco`, `bancoDeHoras`, `horaExtra`, `adicionalNoturno`, `exibirHoraDiurnaReduzida` + `horaDiurnaReduzida` (HH:mm:ss, >0 e ≤ 01:00:00; padrão `00:50:00`), `exibirHoraNoturnaReduzida` + `horaNoturnaReduzida` (padrão `00:52:30`).
- **Jornada (tabela do topo):** `jornada.<dia>` com `domingo`…`sabado`; por dia `entrada1`…`saida5`, `toleranciaFalta`, `toleranciaExtra`, `cargaHoraria` (HH:mm), `almocoLivre`, `compensado`, `neutro`. No tipo **Diária** a tela só exibe `cargaHoraria` e `neutro`; a factory recusa os demais.
- **Aba Horas Extras:** `horasExtras.usarConfiguracaoDoHorario` (nome de OUTRO horário já cadastrado; falha com a lista de opções se não existir) **ou** `horasExtras.percentuais` (`diaUtil`, `sabado`, `domingo`, `feriado`, `facultativo`, `diaUtilNoturno`, `sabadoNoturno`, `domingoNoturno`, `folga`, `facultativoNoturno`; inteiros 1–100). Os dois juntos são recusados.
- **Aba Coluna:** `colunas.<código>` com `impressao`, `edicao`, `preFolha` (booleanos). Códigos: `HT CH SP SN EA SA AB BS BT BC BD BA ADCNOT HRD JUS EXT AN SPDR SNDR ResponsavelImediato`. Padrão do SGE: Impressão e Editar marcados, Pré-Folha desmarcado.

## Comportamento da tela observado

- Salvar só exige Descrição e Tipo (Período e Coluna Refeição já vêm preenchidos); a jornada pode ficar vazia. Sucesso: aviso "O horário foi salvo com sucesso" (botão Ok) e volta à consulta. Dados inválidos: aviso "Verifique os dados informados" sem mensagem por campo visível.
- O SGE **aceita descrição repetida** em Horários (diferente de Feriados/Facultativo). A action escolhe a primeira sequência livre para manter a conferência e a exclusão sem ambiguidade; `excluir` falha se achar mais de um registro com o mesmo nome.
- A grade tem Descrição e Dia Início (Período); **sem lixeira**. Clicar na descrição abre "Editar Horário" (Salvar, Excluir, Voltar). Excluir pede "Tem certeza que deseja excluir?" → "Sim" e volta à consulta, sem aviso de sucesso.
- **Percentuais de Horas Extras e Colunas só gravam na edição.** Na inclusão os percentuais ficam somente leitura (o seletor já traz a configuração do "Horário Professor") e as alterações da aba Coluna não persistem. Por isso a action salva o horário, reabre e então aplica percentuais/colunas.
- Selecionar a configuração de outro horário preenche os percentuais (somente leitura); depois de salvo, o horário passa a ter uma cópia própria (o seletor aponta para ele mesmo) e a action confere que os valores copiados persistiram.
- Máscaras: horas `HH:mm` aceitam `fill`; horas reduzidas são `HH:mm:ss`; `cargaHoraria` aceita mais de 24 h; "Fixar a carga horária" só aceita dígitos. Digitar tecla a tecla nas máscaras não funciona; use `fill`.
- Persistência: ao final a action reabre o horário e confere tudo o que foi configurado (Geral, jornada, Horas Extras, Coluna).

## Ambiente

O POST de login do SGE chegou a levar ~22 s (padrão do `loginSge` é 20 s); as specs passam `timeout: 60000` ao `loginSge`. A opção "Utilizar configuração do horário" depende dos horários já existentes no tenant (ex.: "Horário Professor").
