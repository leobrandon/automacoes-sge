# Especificação: automação de Tipo de Registro Pedagógico

## Objetivo

Automatizar pela interface do SGE sandbox o cadastro e a exclusão controlada de um registro para cada opção de **Cadastro > Ensino > Tipo de Registro Pedagógico**:

1. Atividades Específicas
2. Conteúdo Aplicado
3. Parecer Descritivo (Ficha de Acompanhamento)
4. Planejamento

O resultado deve seguir os padrões de Playwright do projeto, deixar os dados criados verificáveis entre as etapas e comprovar que cada registro foi removido da consulta após a exclusão.

## Contexto observado

- A tela da consulta mostra descrição, tipo, tipo de turma, composição, anos escolares, periodicidade e situação ativo.
- O menu **Adicionar** oferece exatamente as quatro opções listadas acima. Cada opção abre um formulário próprio.
- Os formulários compartilham descrição, tipo de turma e situação ativa, mas têm regras específicas. Tipos de turma observados/documentados: Escolarização, AEE, Diversificada e Alternativa.
- A documentação do desenvolvedor descreve descrição obrigatória (até 100 caracteres), ano e tipo de turma obrigatórios; composição é obrigatória exceto para AEE. Periodicidade não se aplica a Conteúdo Aplicado e Atividades Específicas.
- Há divergência documental para composição: a base local diz que o campo de Atividades Específicas depende do tipo de turma e fica oculto para AEE e Diversificada; a documentação do desenvolvedor diz que composição é exigida salvo AEE. A implementação deve observar o estado real do formulário para cada combinação selecionada e preencher composição somente quando o controle estiver disponível/obrigatório.
- Parecer Descritivo e Planejamento apresentam periodicidade, composição, anos escolares, modo de organização dos grupos, opções de aprovação/alteração e assinatura. Planejamento também exige Tipo do Registro (Único ou Por Componente) e pode exibir opções adicionais conforme a finalidade.
- Conteúdo Aplicado apresenta opções próprias de aprovação, lançamento, componente, data futura, contagem de aulas, atividades específicas e organização. Os padrões do formulário devem ser preservados para campos opcionais sem requisito específico no cenário.
- A exclusividade de Conteúdo Aplicado é mais ampla: a documentação informa que uma combinação ativa de composição, tipo de turma e ano não pode ser duplicada, ainda que a descrição seja diferente. A combinação configurada deve ser válida para o sandbox.
- A exclusão abre confirmação irreversível. Portanto, a automação precisa conferir a linha exata antes de confirmar e verificar sua ausência depois.

## Abordagens consideradas

1. **Um spec genérico parametrizado por tipo**: reduz duplicação, mas oculta as diferenças entre quatro formulários e torna cada cenário menos direto para depurar.
2. **Quatro criações e quatro exclusões sem compartilhamento**: mantém cada fluxo explícito, mas duplica navegação, leitura de dados e sincronização.
3. **Recomendado — oito specs independentes com ações comuns**: mantém uma criação e uma exclusão específicas por tipo, com leitores de configuração e ações auxiliares reutilizáveis. Equilibra rastreabilidade e manutenção sem transformar os quatro formulários em um fluxo genérico opaco.

## Estrutura proposta

Criar `tests/Cadastro/Tipo de Registro Pedagógico/`, separando os arquivos por opção do sistema. Cada pasta contém os dois specs e seus JSONs de criação/exclusão:

| Pasta | Cenário | Spec | Dados |
|---|---|---|---|
| `Atividades Específicas/` | Criar | `criar_atividades_especificas_action.spec.ts` | `dados_atividades_especificas.json` |
| `Atividades Específicas/` | Excluir | `excluir_atividades_especificas_action.spec.ts` | `dados_exclusao_atividades_especificas.json` |
| `Conteúdo Aplicado/` | Criar | `criar_conteudo_aplicado_action.spec.ts` | `dados_conteudo_aplicado.json` |
| `Conteúdo Aplicado/` | Excluir | `excluir_conteudo_aplicado_action.spec.ts` | `dados_exclusao_conteudo_aplicado.json` |
| `Parecer Descritivo (Ficha de Acompanhamento)/` | Criar | `criar_parecer_descritivo_action.spec.ts` | `dados_parecer_descritivo.json` |
| `Parecer Descritivo (Ficha de Acompanhamento)/` | Excluir | `excluir_parecer_descritivo_action.spec.ts` | `dados_exclusao_parecer_descritivo.json` |
| `Planejamento/` | Criar | `criar_planejamento_action.spec.ts` | `dados_planejamento.json` |
| `Planejamento/` | Excluir | `excluir_planejamento_action.spec.ts` | `dados_exclusao_planejamento.json` |

Os caminhos completos dos quatro módulos são `tests/Cadastro/Tipo de Registro Pedagógico/Atividades Específicas/`, `tests/Cadastro/Tipo de Registro Pedagógico/Conteúdo Aplicado/`, `tests/Cadastro/Tipo de Registro Pedagógico/Parecer Descritivo (Ficha de Acompanhamento)/` e `tests/Cadastro/Tipo de Registro Pedagógico/Planejamento/`. Cada spec lê seu JSON na mesma pasta. Os specs mantêm nomes distintos e testes separados. Um leitor de configuração valida os JSONs; factories podem completar valores válidos sem substituir campos expressamente configurados. Ações reutilizáveis cobrem navegação pelo menu visível, consulta por descrição, as interações compartilhadas e asserções comuns. Ações específicas cobrem os campos particulares de cada formulário. Os helpers e barrels existentes devem ser estendidos somente onde necessário, seguindo os padrões atuais em `src/actions`, `src/factories` e `src/helpers/navigation`. Como os specs ficarão quatro níveis abaixo da raiz do projeto, suas importações para `src` devem usar o caminho relativo correspondente (`../../../../src/...`).

## Contrato dos dados

- Cada arquivo de criação configura os campos necessários daquele formulário; qualquer descrição criada começa com `QAAUTO` e segue o padrão semântico com sequência `1`, sem data, GUID ou sufixo aleatório.
- Os quatro arquivos de exclusão apontam para uma descrição `QAAUTO` exata, correspondente ao cenário de criação. Não haverá exclusão em lote nem busca genérica por prefixo.
- Os arquivos de exclusão não contêm credenciais. O login usa o mecanismo existente e variáveis locais de ambiente.
- A quantidade padrão é um registro por cenário. Para este módulo, dados e exclusão permanecem limitados a uma descrição por tipo para manter o alvo inequívoco.
- Cada exclusão localiza a linha pela descrição exata, confirma também tipo de registro/turma/composição/ano quando exibidos, exige uma única linha e falha sem confirmar caso a linha seja ambígua ou divergente.
- A execução documentada é sequencial: as quatro criações são executadas antes das quatro exclusões. Uma exclusão isolada exige que seu registro exato configurado exista; ela nunca amplia o alvo para outros registros `QAAUTO`.

## Fluxos e prova funcional

### Criação

1. Resolver a URL do sandbox e recusar hosts diferentes de `sandbox.pontoid.com.br`.
2. Fazer login pelo helper existente.
3. Abrir **Cadastro**, **Ensino** e **Tipo de Registro Pedagógico** usando os controles visíveis.
4. Abrir **Adicionar**, escolher a opção do cenário e aguardar controles dependentes, especialmente composição após tipo de turma.
5. Preencher campos obrigatórios e valores explicitamente fornecidos no JSON; usar seleções visíveis para dropdowns personalizados.
6. Salvar e confirmar feedback de sucesso na interface.
7. Consultar a descrição exata e confirmar uma linha com os dados-chave esperados. HTTP 200 isolado não comprova o cadastro.
8. Preservar o registro para que a spec de exclusão correspondente possa consumi-lo.

### Exclusão

1. Navegar pela mesma sequência visível até a consulta.
2. Pesquisar a descrição exata configurada e exigir uma única linha compatível com o JSON.
3. Acionar excluir nessa linha, conferir a confirmação irreversível e só então confirmar.
4. Conferir a mensagem de sucesso, fechar o aviso e consultar novamente a mesma descrição.
5. Exigir que a linha não exista mais na grade.

## Regras por tipo

- **Atividades Específicas:** configurar descrição, tipo de turma e composição apenas conforme o campo condicional exibido; preservar os padrões das opções de exportação. Não criar grupos ou itens filhos neste escopo.
- **Conteúdo Aplicado:** configurar a combinação de turma/composição/ano e opções obrigatórias do formulário. Evitar uma combinação já ocupada conforme a regra de unicidade; não alterar cadastros existentes.
- **Parecer Descritivo:** configurar finalidade, periodicidade e composição/anos requeridos; manter as demais opções nos valores explicitamente definidos no JSON ou nos padrões seguros da tela.
- **Planejamento:** configurar finalidade, periodicidade, composição/anos e Tipo do Registro. Opções condicionais à finalidade só serão preenchidas se forem necessárias e estiverem expostas no formulário.

## Restrições e tratamento de falhas

- Toda preparação, cadastro, consulta e exclusão é pela UI. Não navegar diretamente para rotas internas e não enviar mutações por API ou banco.
- Usar `workers: 1`, `--retries=0`, auto-wait e assertions web-first; não usar `waitForTimeout` como sincronização normal.
- Confirmar visibilidade antes de interagir. Para papéis que o SGE mantém fora da árvore ARIA, reutilizar `getByRoleSge` do projeto e preservar `toBeVisible()`.
- Não adicionar consulta prévia ou limpeza automática aos specs de criação persistente. Uma falha de criação mantém a evidência e não inicia exclusão automática.
- Se o ambiente, opções do cadastro ou combinação necessária diferirem da observação, preservar a assertion esperada e relatar a diferença; não relaxar a regra ou alterar registros existentes para obter resultado verde.

## Validação de aceite

- Os oito specs são descobertos pelo projeto `regression`, sem `skip`/`fixme` e com um teste funcional por arquivo.
- Os JSONs são analisados e validados com mensagens claras para descrição ausente, não-QAAUTO, campos obrigatórios ou combinações inválidas.
- Cada criação mostra confirmação da interface e a linha correspondente na grade.
- Cada exclusão confirma somente o alvo configurado e mostra que a linha exata desapareceu.
- Rodar o conjunto completo em ordem (criações e depois exclusões) duas vezes, com condições independentes, `--workers=1 --retries=0`; ambas as execuções precisam passar. Uma falha de rede, produto, sessão ou dados impede declarar aprovação funcional.
- Não executar essas E2E durante a etapa de especificação/plano. A execução ocorrerá na fase de implementação e validação.

## Fora de escopo

- Criar, editar ou excluir grupos/itens internos dos registros.
- Limpar registros `QAAUTO` em lote ou cadastros que não correspondam exatamente às configurações deste módulo.
- Modificar a aplicação SGE, documentação externa, dados de outros cadastros ou credenciais.
