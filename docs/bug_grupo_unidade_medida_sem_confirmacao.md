# Bug: ao salvar um Grupo de Unidade de Medida, a tela não confirma e o servidor retorna HTTP 500

## Resumo
Em Configurações > Definições Iniciais > Itens > Grupos de Unidade de Medida, ao clicar em **Salvar** no modal de adição, o registro é gravado, mas o usuário não recebe a confirmação "Sucesso!" e o modal continua aberto. Logo após o salvamento, o navegador chama `GET /grupounidadedemedida/Editar/<id>` e o servidor responde **HTTP 500 (Runtime Error)**.

## Ambiente
- Homologação: https://homologa-sge.pontoid.com.br/
- Versão exibida no rodapé do SGE: 1.113.0.126 - 2026
- Perfil: Secretaria de Educação
- Navegador: Chrome (reproduzido também com Playwright em Chrome headless)

## Pré-condição
Existir ao menos uma Unidade de Medida cadastrada (Configurações > Definições Iniciais > Itens > Unidades de Medida). Sem ela, o campo "Unidade de medida para conversão" fica vazio e não é possível salvar o grupo.

## Passos para reproduzir
1. Acessar Configurações > Definições Iniciais > Itens > Grupos de Unidade de Medida.
2. Clicar em **Adicionar**.
3. Preencher **Descrição** (ex.: `Grupo teste chamado`) e escolher uma **Unidade de medida para conversão**.
4. Clicar em **Salvar**.

## Resultado esperado
Alerta "Sucesso!" (como nas demais telas do mesmo menu, por exemplo "Unidade de Medida adicionada!" e "Categoria adicionada!") e o modal fechado ou passando para o modo de edição.

## Resultado obtido
- Nenhum alerta é exibido.
- O modal continua aberto, com os campos preenchidos (o campo oculto `Id` continua `0`).
- O registro **foi gravado**: ao fechar o modal e pesquisar, o grupo aparece na grade.
- Clicar em **Salvar** novamente com o mesmo nome exibe "Atenção! Já existe um grupo de unidade de medida com este nome.", o que confirma que o primeiro clique gravou.
- No DevTools (Console): `Failed to load resource: the server responded with a status of 500 () @ https://homologa-sge.pontoid.com.br/grupounidadedemedida/Editar/<id>`.

## Evidência técnica (DevTools > Network)
| Ordem | Requisição | Resposta |
| --- | --- | --- |
| 1 | `POST /GrupoUnidadeDeMedida/PostGrupoUnidadeDeMedida/` | 200, corpo `{"success":true,"sucesso":true,"id":608}` |
| 2 | `GET /grupounidadedemedida/Editar/608` | **500**, página HTML "Runtime Error" |

O `id` muda a cada gravação (608 foi o da última tentativa). A mesma sequência ocorreu em todas as tentativas.

## Hipótese (não confirmada)
Após gravar, a tela carrega a edição do registro recém-criado para exibir a confirmação. Como `Editar/<id>` falha no servidor, o fluxo é interrompido antes do alerta de sucesso. A causa deve estar no endpoint `GET /grupounidadedemedida/Editar/{id}`; vale verificar o log de erro do servidor na hora da chamada.

## Impacto
- O usuário não sabe se o grupo foi salvo e tende a clicar em Salvar de novo, o que gera a mensagem de duplicidade.
- A exclusão pela lixeira da grade funciona normalmente.
- Não foi verificado se abrir um grupo existente pelo ícone de edição (`carregueModal(<id>)`) apresenta o mesmo erro.

## Impacto na automação
O spec de criação de Grupo valida o sucesso pela resposta do `POST` (`success: true`) e pela presença do registro na grade, e fecha o modal manualmente. Quando o defeito for corrigido, a ação `criarGrupoDeUnidadeDeMedida` (`src/actions/criar-grupo-de-unidade-de-medida.action.ts`) deve voltar a validar o alerta "Sucesso!", como as demais telas do menu.

## Dados de teste usados
Registros com prefixo `QAAUTO` (ex.: `QAAUTO Grupo de Unidades 1`), todos excluídos ao final das execuções.
