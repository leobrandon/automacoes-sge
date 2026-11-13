# Como criar Pull Request neste repositório (para agentes: Codex, Claude etc.)

Repositório: `leobrandon/automacoes-sge` (remote `origin`, HTTPS). Branch base: `main`.

## Como funciona no ambiente do Claude (referência)

O PR é criado pelo **GitHub CLI (`gh`)**, autenticado na conta `leobrandon` com escopos `repo`, `workflow`, `read:org`, `gist`.
O token fica no chaveiro do Windows (Credential Manager). O `git push` usa o `credential.helper=manager`.
Não há conector/MCP do GitHub envolvido: é só `git` + `gh` no terminal.

## Passo a passo

### 1. Verifique a autenticação do `gh`

```powershell
gh auth status
```

Deve aparecer `Logged in to github.com account leobrandon` com escopo `repo`.

### 2. Se o token estiver inválido (erro 401/403 ou "token invalid")

a) Veja se há variável de ambiente sobrescrevendo o login. **Token velho em `GH_TOKEN`/`GITHUB_TOKEN` tem prioridade sobre o chaveiro e causa exatamente esse erro:**

```powershell
echo $env:GH_TOKEN
echo $env:GITHUB_TOKEN
```

Se houver valor, remova da sessão (`Remove-Item Env:GH_TOKEN`) e das variáveis de usuário do Windows.

b) Faça login de novo. **Isto precisa ser feito pelo usuário, num terminal dele** (o agente não deve digitar senha/token):

```powershell
gh auth login -h github.com -p https -w
gh auth setup-git
```

Escolha "Login with a web browser", copie o código de 8 dígitos e autorize. Se o login já existir mas faltar permissão: `gh auth refresh -h github.com -s repo -s workflow`.

c) Confirme com `gh auth status` e `gh pr list --limit 3`.

### 3. Publique a branch e crie o PR

```powershell
git push -u origin <nome-da-branch>
gh pr create --base main --head <nome-da-branch> --title "Título do PR" --body "Descrição"
```

Para corpo longo, use arquivo: `gh pr create --base main --title "..." --body-file pr_body.md`.

### 4. Se o `gh` continuar sem funcionar (alternativa sem token)

Depois do `git push`, abra no navegador (já logado) e clique em "Create pull request":

```
https://github.com/leobrandon/automacoes-sge/pull/new/<nome-da-branch>
```

## Por que o Codex pode falhar mesmo com o `git push` funcionando

| Sintoma | Causa provável | Solução |
|---|---|---|
| `git push` ok, mas `gh` diz token inválido | O `gh` do Codex lê outro perfil/ambiente (sandbox sem acesso ao chaveiro) ou há `GH_TOKEN` antigo | Passo 2 acima; rodar o `gh` com o mesmo usuário Windows e fora do sandbox restrito (aprovar o comando/escalar permissão) |
| Conector GitHub do Codex retorna **403** ao criar PR | O app do Codex no GitHub não tem permissão de escrita em *Pull requests* neste repositório | GitHub → Settings → Applications → (app do Codex / ChatGPT) → Configure → dar acesso ao repositório `automacoes-sge` com **Pull requests: Read and write** e **Contents: Read and write** |
| `gh` não encontra rede/host | Sandbox sem acesso à internet | Liberar rede para `github.com` e `api.github.com` |

> `git push` funciona porque usa o Git Credential Manager; o conector e o `gh` usam credenciais **diferentes**, por isso um pode funcionar e o outro não.

## Regras do projeto para o PR

- Não incluir "Generated with Claude Code", `Co-Authored-By` ou qualquer atribuição a IA em PR, commit ou código.
- Não commitar credenciais (`.env` fica fora do versionamento; só `.env.example`).
- Um PR por feature, a partir de `main` atualizada.
