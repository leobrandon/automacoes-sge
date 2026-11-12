# Automação de Justificativa de Frequência

## Objetivo

Adicionar dois testes Playwright independentes para Justificativas de Frequência no SANDBOX. O teste de criação cadastra duas justificativas QAAUTO, com Abono = Sim e Abono = Não, confirma cada uma na grade e as mantém para conferência. O teste de exclusão remove somente as descrições exatas listadas em seu próprio JSON e confirma a ausência de cada uma. Executar criação antes de exclusão.

## Fluxo e evidências da interface

- A entrada visível é Cadastro > Ensino > Justificativa de Frequência. O menu usa o nome no singular e a tela de consulta apresenta “Consulta de Justificativas de Frequência”.
- A grade mostra as colunas Descrição, Abono e Ativa.
- O formulário de adição contém Descrição obrigatória, o switch Abono (desmarcado por padrão), o switch Ativa (marcado por padrão) e o botão Salvar.
- A confirmação funcional de criação será a presença da descrição exata na grade e a célula Abono correspondente a “Abona” ou “Não abona”. A confirmação funcional de exclusão será a ausência da descrição pesquisada após a confirmação do diálogo.
- Nenhum cadastro foi criado durante a exploração.

## Organização

- `src/helpers/navigation/justificativa-frequencia.navigation.ts`: abre a consulta pelo menu visível, pesquisa descrições e fornece locators da grade e confirmação de exclusão.
- `src/factories/justificativa-frequencia.factory.ts`: valida opções, gera nomes QAAUTO determinísticos com sequência e alterna Abono segundo os dados configurados.
- `src/actions/criar-justificativa-frequencia.action.ts`: preenche e salva pelo formulário visível, confirmando persistência e o valor de Abono.
- `src/actions/excluir-justificativa-frequencia.action.ts`: exclui uma descrição QAAUTO exata, confirma o diálogo e valida sua ausência.
- `src/actions/index.ts`: exporta as duas ações.
- `tests/Cadastro/justificativa-de-frequencia/criar_justificativa_frequencia_action.spec.ts`: cria as duas entradas, valida a grade e registra um `console.log` por criação confirmada.
- `tests/Cadastro/justificativa-de-frequencia/excluir_justificativa_frequencia_action.spec.ts`: exclui as descrições configuradas, valida a ausência e registra um `console.log` por exclusão confirmada.
- `tests/Cadastro/justificativa-de-frequencia/dados_justificativa_frequencia.json`: configura quantidade, descrição base e a sequência de valores Abono Sim/Não.
- `tests/Cadastro/justificativa-de-frequencia/dados_exclusao_justificativa_frequencia.json`: lista as duas descrições QAAUTO exatas autorizadas para exclusão e a quantidade esperada. Não há exclusão em lote por prefixo.

## Segurança dos dados e repetibilidade

- O ciclo usa apenas a UI visível do SANDBOX configurado em `.env`; não acessa rotas internas diretamente nem simula chamadas de mutação.
- A criação informa nomes QAAUTO relacionados à Justificativa de Frequência e com sequência determinística.
- A criação exige que os nomes determinísticos ainda não existam antes de salvar. A exclusão exige que cada descrição QAAUTO listada no JSON exista uma única vez na grade antes de clicar em Remover.
- Como os testes são separados, a criação mantém os registros até a execução explícita do teste de exclusão. O JSON de exclusão é a lista restrita dos nomes esperados; não autoriza uma busca ampla por prefixo.
- A automação não grava credenciais e exige `workers=1` e `retries=0`.

## Validação

1. Executar a spec de criação com um worker e retries desativados; conferir os dois logs `CRIADA E CONFERIDA`.
2. Executar a spec de exclusão com um worker e retries desativados; conferir os dois logs `EXCLUÍDA E CONFERIDA`.
3. A separação das specs recebeu checagem TypeScript, mas ainda requer a execução E2E pelo usuário.

## Critérios de aceite

- Dois cadastros são criados pela UI visível, um abonando a falta e outro sem abono.
- A grade confirma a descrição exata e o estado de Abono de cada cadastro.
- O teste de exclusão aceita somente as duas descrições QAAUTO listadas explicitamente no JSON e a grade confirma a ausência de ambas.
- Há arquivos de teste, ações e JSONs distintos para criação e exclusão.
- Cada spec emite `console.log` após confirmar seu resultado na grade.
