# Progresso — Conselheiros

## Ajuste de autenticação

- O responsável informou timeout de 20 segundos no login, com POST de autenticação pendente.
- Diagnóstico temporário de login fora do sandbox, sem criar conselheiro, usando limite de 60 segundos: passou em 24,2 segundos. O arquivo temporário foi removido.
- O spec de criação passou a chamar `loginSge(page, {timeout: 60000})`, sem alterar o helper compartilhado.
- Criação fora do sandbox, regression/workers=1/retries=0: **1 passed**, 31,5 segundos. Preservado `QAAUTO Conselheiro Dois`, CPF sintético `501.902.479-16`, além da massa anterior. Nenhum teste de exclusão executado.

## Retomada solicitada pelo responsável

- Implementada a criação em `src/actions/criar-conselheiro.action.ts`, com dados em `tests/Conselho Tutelar/conselheiros/dados_conselheiro.json` e spec `criar_conselheiro_action.spec.ts`; export em `src/actions/index.ts`.
- `npx tsc --noEmit`: passou após a implementação.
- Teste de criação fora do sandbox, regression/workers=1/retries=0: primeira execução falhou antes de salvar porque a espera por GOIÂNIA também correspondia a outras cidades. Corrigida para correspondência exata.
- Segunda execução do mesmo comando: **1 passed**, 11,1 s. Registro criado e confirmado na consulta: QAAUTO CONSELHEIRO DOIS, CPF sintético 591.742.775-53. A criação isolada preserva o registro.
- Permanecem o conselheiro exploratório QAAUTO CONSELHEIRO UM e o bairro QAAUTO Bairro Conselheiro 1. Exclusão e ciclo não foram implementados ou validados porque a tela de edição apresentou erro e não foi confirmada exclusão efetiva.

Plano aprovado pelo responsável em 12/11/2026, incluindo uma criação exploratória e parada caso não exista exclusão. Exploração no navegador interno; futuros E2E fora do ambiente restrito.

**Estado atual: interrompido a pedido do responsável após erro da página. Não retomar sem nova instrução.** O registro abaixo do bloqueio de bairro é histórico; a autorização posterior e a massa efetivamente criada estão no encerramento ao final.

| Fase | Estado |
| --- | --- |
| 0 — Preparação | Concluída; TypeScript sem erros, sessão confirmada |
| 1 — Exploração e viabilidade de exclusão | Interrompida pelo responsável após erro ao abrir cadastro salvo |
| 2 — Implementação | Não iniciada; depende da exclusão |
| 3 — Validação | Pendente |
| 4 — Registro | Em atualização |

- `npx tsc --noEmit`: código 0 (linha de base após aprovação).
- Navegador interno reutilizado, sessão Secretaria de Educação / SECRETARIA MUNICIPAL BRANDÃO / 2026 confirmada.
- Consulta inicial sem resultados para ativos; inativos ainda precisam ser inspecionados.
- Referências e evidências anteriores estão no plano aprovado. Nenhuma massa foi salva durante o planejamento.
- Arquivos: este progresso criado; nenhum arquivo de automação de Conselheiros criado ou alterado.

## Massa e pendências

Nenhuma massa própria criada. Formulário exploratório abandonado por Voltar, sem Salvar. Nenhuma pessoa, conselheiro, bairro, usuário ou permissão foi criado. A escola existente foi aberta somente para leitura do endereço e não foi alterada.

## Exploração após aprovação

- Desmarcado `SomenteAtivos` pela UI; checkbox false e consulta sem resultados confirmados. Não há conselheiro listado com esse filtro na sessão atual.
- CPF sintético `990.000.001-30`: consulta novamente mostrou `Nenhum possível cadastro encontrado. Deseja realizar um novo cadastro?`. Sim abriu formulário novo; nenhum reaproveitamento de pessoa.
- Nome `QAAUTO Conselheiro 1` apresentou validação exata: `Nome não deve conter caracteres especiais ou números.`. Ajuste exploratório para `QAAUTO Conselheiro Um` eliminou essa mensagem. A futura factory deverá usar sequência por extenso, preservando prefixo QAAUTO.
- Campos preenchidos apenas no formulário não salvo: nascimento 01/01/1990, sexo Masculino, email sintético em example.invalid, observação QAAUTO, CEP 74.000-000, logradouro QAAUTO, UF GOIÁS e cidade GOIÂNIA. Não foi acionada busca externa de CEP nem qualquer envio.
- Dependência UF → Cidade observada: cidades carregam assincronamente; GOIÂNIA disponível com valor 5178. Depois de selecionar a cidade, Bairro (`PessoaBairroId`, obrigatório por asterisco) ficou somente com opção vazia. Dropdown exibiu `Nenhum resultado encontrado`, inclusive na busca CENTRO. Não foi tentado salvar ignorando esse obrigatório.
- Apoio conferido por menus: Cadastro > Escolas > Escola > ESCOLA MUNICIPAL CULTURA > Endereço/Contato. Cidade GOIÂNIA, UF GOIÁS; Bairro sem seleção. Somente leitura, sem salvar nem autenticar escola.
- Confirmação independente por menus: Cadastro > Localização > Bairros. `Consulta de Bairros`, pesquisa vazia, grade com `<Nenhum resultado>`. Não há bairro disponível na consulta apresentada. Botão de adicionar existe, mas não foi acionado porque criar a cadeia de apoio está fora do plano aprovado.
- Evidência: snapshots AX e screenshot do navegador interno nesta conversa, com título Consulta de Bairros, colunas Bairro/UF/Cidade/Região/Sub-região e mensagem `<Nenhum resultado>`.

## BLOQUEIO — Conselheiros / Bairro obrigatório

O dado de apoio não está disponível: formulário exige Bairro e a consulta de Bairros está vazia. O plano aprovado, seção 4/Fase 0, proíbe criar bairro por conta própria; seção 5 manda parar se dados de apoio não satisfizerem o tenant. A skill playwright-e2e-engineer também determina que a automação não crie a cadeia de apoio sem pedido.

Decisão pendente: autorizar um único bairro QAAUTO em GOIÂNIA pela UI como preparação de apoio, ou o responsável cadastrar/indicar um bairro disponível. Se autorizado, registrar a nova massa de apoio, suas dependências e o destino dela; não ampliar para automação de Bairros.

- TypeScript de base passou; nenhum spec E2E foi executado. Quando houver viabilidade e implementação, testes serão fora do ambiente restrito com workers=1/retries=0.
- Exclusão de conselheiro continua não confirmada, pois o primeiro cadastro ainda não foi salvo.
- Arquivos desta etapa: plano (status de aprovação atualizado) e este progresso. Nenhum código de automação criado.

## Encerramento após autorização A e pedido de parada

Critério de aceite esclarecido pelo responsável após seus testes manuais: a criação deve ser validada voltando à consulta pelo menu e encontrando exatamente uma linha com o nome e CPF do conselheiro salvo. O erro de conexão após salvar será tratado pelo responsável em bug separado. A viabilidade de exclusão continua pendente.

- Responsável escolheu A: autorizou criar um único bairro QAAUTO em GOIÂNIA como apoio. Nenhuma automação de Bairros foi criada.
- Bairro criado pela UI: **QAAUTO Bairro Conselheiro 1**, UF GOIÁS, município exibido GOIANIA. Mensagem `Bairro salvo com sucesso!`; pesquisa por nome confirmou uma única linha. No formulário de Conselheiros, o bairro ficou disponível com ID **26847** e foi selecionado.
- Criado um único conselheiro exploratório autorizado: **QAAUTO CONSELHEIRO UM**, CPF sintético **990.000.001-30**, nascimento 01/01/1990, sexo Masculino, email sintético `qaauto.conselheiro1@example.invalid`, CEP 74.000-000, logradouro `QAAUTO Rua de Teste`, UF GOIÁS, cidade GOIÂNIA (5178), bairro QAAUTO (26847), observação `QAAUTO Conselheiro Um exploracao autorizada`, presidente desmarcado. Nenhuma criação de usuário/credencial ou envio foi acionada pelo agente.
- Salvar exibiu **`Conselheiro Tutelar cadastrado com sucesso.`**, mas a página seguinte mostrou **`Não foi possível estabelecer uma conexão com o servidor.`** e `Por favor, verifique o endereço informado e/ou aguarde alguns instantes e tente novamente.`
- Sem repetir gravação, consulta aberta pelo menu visível confirmou **uma linha**: nome convertido para maiúsculas `QAAUTO CONSELHEIRO UM`, CPF `990.000.001-30`, email sintético e data de cadastro **12/11/2026**. Não havia botão de exclusão na linha inspecionada. O filtro Ativo não foi reavaliado nessa retomada; não inferir seu estado.
- Clique na própria linha para verificar edição/exclusão novamente terminou na mesma mensagem de conexão. O ID do conselheiro não foi obtido. A causa técnica não foi determinada; o texto genérico da aplicação não prova falha de DNS, rede do runner ou inexistência do registro.
- Screenshots e snapshots da conversa registram sucesso + erro na mesma tela, linha persistida e erro ao abrir. O responsável determinou: **`Deu erro na página do sistema, pode parar por aí`**. Nenhuma nova navegação ou mutação será feita após essa instrução.
- **Massa remanescente:** bairro QAAUTO Bairro Conselheiro 1 (26847) e conselheiro QAAUTO CONSELHEIRO UM / CPF sintético 990.000.001-30. Não houve exclusão, inativação nem tentativa por API/banco. Preservados até nova instrução.
- **Implementação:** nenhum arquivo de factory/navigation/action/config/JSON/spec de Conselheiros foi criado. Somente plano e progresso. Exclusão efetiva continua não confirmada.
- **Validação:** linha de base `npx tsc --noEmit` passou; nenhum E2E de Conselheiros executado. A orientação de rodar futuros E2E fora do ambiente restrito permanece registrada.
