# Como contribuir

Guia de trabalho do grupo no `4frames-web-app`. Vale para todas as pessoas do grupo e para qualquer código escrito com ajuda de IA.

A API fica em [`4frames-core-api`](https://github.com/tech-challenge-41/4frames-core-api) e segue as mesmas regras. As convenções de código e a estrutura de features estão no [`CLAUDE.md`](./CLAUDE.md). Como rodar o projeto está no [`README.md`](./README.md).

## Regras em resumo

1. Todo trabalho sai de `develop` em uma branch própria e volta para `develop` por pull request.
2. Ninguém commita direto em `develop` ou `main`.
3. Todo PR precisa da aprovação de outra pessoa, e quem mescla não é o autor.
4. Lint, type-check, testes e build passam antes de pedir revisão.
5. Commits seguem Conventional Commits e são sempre feitos por uma pessoa, nunca por IA.
6. `.env`, tokens e senhas reais nunca entram no git.

> O repositório é privado no plano GitHub Free, que não oferece branch protection. O GitHub não impede ninguém de quebrar essas regras: elas dependem de cada um.

## Ambiente

Pré-requisitos: Node.js 24 ou superior, pnpm 10 e git. Para o fluxo completo, a API precisa estar rodando (ver o README do `4frames-core-api`).

No Windows, configure o git para manter os finais de linha em LF antes de trabalhar:

```bash
git config core.autocrlf input
```

Se o clone foi feito antes dessa configuração, os arquivos continuam com CRLF no disco. Com a árvore de trabalho limpa, renormalize uma única vez. Arquivos fora do git, como o `.env`, não são afetados:

```bash
git rm -r --cached -q . && git reset --hard -q HEAD
```

Para confirmar, o comando abaixo deve imprimir `0`:

```bash
git ls-files --eol | grep -c "w/crlf"
```

## Branches

| Branch               | Papel                                                                                        |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `main`               | Só versões fechadas. Recebe `develop` por PR a cada release e ganha uma tag `release-X.Y.Z`. |
| `develop`            | Integração e branch padrão do repositório. Tudo entra aqui por PR.                           |
| `<tipo>/<descrição>` | Trabalho do dia a dia, criada a partir de `develop` atualizada.                              |

O nome da branch usa o mesmo tipo do commit e uma descrição curta em kebab-case. Não use número de card do kanban, que não significa nada para quem lê o histórico do git:

```text
feat/meus-videos
fix/job-status-polling
docs/contributing
```

Fluxo básico:

```bash
git switch develop
git pull
git switch -c feat/meus-videos
# trabalho e commits
git fetch origin
git rebase origin/develop
git push -u origin feat/meus-videos
```

Depois que o PR recebeu revisão, atualize a branch com `git merge origin/develop` em vez de rebase, para não reescrever commits que alguém já leu. Nunca use `git push --force` em `develop` ou `main`. Na sua própria branch, se precisar, use `git push --force-with-lease`.

## Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/):

```text
<tipo>(<escopo opcional>): <descrição no imperativo, minúscula, sem ponto final>

<corpo opcional: por que a mudança foi feita>

<rodapé opcional: BREAKING CHANGE, Co-Authored-By>
```

| Tipo       | Quando usar                                    |
| ---------- | ---------------------------------------------- |
| `feat`     | Funcionalidade nova                            |
| `fix`      | Correção de bug                                |
| `refactor` | Mudança de código sem mudar comportamento      |
| `test`     | Só testes                                      |
| `docs`     | Só documentação                                |
| `build`    | Dockerfile, dependências, configuração do Vite |
| `ci`       | GitHub Actions                                 |
| `style`    | Só CSS ou formatação, sem mudar comportamento  |
| `perf`     | Melhoria de desempenho                         |
| `chore`    | Manutenção que não se encaixa nos outros tipos |

Escopos usados neste repositório: `auth`, `convert`, `job-status`, `videos`, `http`, `routes`, `ui`. Omita o escopo quando a mudança for transversal.

```text
feat(videos): tela meus vídeos com status e download
fix(convert): chamar complete antes de navegar para o status
refactor(http)!: jobId passa a ser string

BREAKING CHANGE: exige a versão da API com jobId em uuid.
```

- Escreva em português, o idioma da documentação do projeto.
- A primeira linha tem no máximo 72 caracteres.
- Um commit, uma ideia. Não misture refatoração com funcionalidade nova.
- Use `!` depois do tipo e o rodapé `BREAKING CHANGE:` quando a mudança exigir outra versão da API ou mudar variáveis de ambiente.

## Hook de pre-commit

O `pnpm install` ativa o Husky. A cada `git commit`, o lint-staged roda só nos arquivos staged:

| Arquivos                                               | O que roda                                 |
| ------------------------------------------------------ | ------------------------------------------ |
| `*.ts`, `*.tsx`, `*.js`                                | `prettier --write` e depois `eslint --fix` |
| `*.css`, `*.html`, `*.md`, `*.json`, `*.yml`, `*.yaml` | `prettier --write`                         |

- As correções automáticas entram no próprio commit.
- Se sobrar um erro que o ESLint não corrige sozinho, o commit é cancelado e a saída mostra arquivo, linha e regra. Corrija e commite de novo.
- O hook não roda type-check, testes nem build. Eles continuam na lista de "Antes de abrir" do PR.
- Não pule o hook com `git commit --no-verify`.
- O estilo está em `.prettierrc.json`. Para formatar o repositório inteiro, rode `pnpm format`.

## Uso de IA

A IA (Claude ou similar) pode escrever código, testes, documentação, descrições de PR e sugestões de mensagem de commit. Tudo que publica algo no repositório é feito por uma pessoa:

- **Nunca por IA:** `git commit`, `git push`, `git merge`, `git tag`, abrir, aprovar ou mesclar PR.
- Quem commita leu o diff inteiro com `git diff --staged` e rodou lint, type-check, testes e build.
- Quem commita responde pelo conteúdo como se tivesse escrito cada linha.
- Quando a IA escreveu parte relevante da mudança, registre isso no rodapé do commit:

```text
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## Pull requests

### Antes de abrir

```bash
pnpm lint
pnpm format:check
pnpm exec tsc -b
pnpm test:coverage
pnpm build
```

Quando se aplicar:

- **Criou uma feature ou tela:** siga a estrutura do `CLAUDE.md` (`api/`, `components/`, teste ao lado do componente, CSS próprio, sem `style={}`).
- **Mudou o que o front espera da API:** confira o contrato com quem cuida do `4frames-core-api` e cite o PR da API na descrição.
- **Criou uma variável `VITE_*`:** adicione ao `.env.example` com um valor seguro para desenvolvimento.
- **Fechou uma limitação conhecida:** atualize as seções de _known gaps_ do `README.md` e do `CLAUDE.md`.

### Ao abrir

- A base é `develop`. Só o PR de release usa `main`.
- O título segue o formato de commit, por exemplo `feat(videos): tela meus vídeos`.
- Preencha o template: o que muda, por que e como testar.
- Mudanças visuais levam print ou GIF na descrição.
- Um assunto por PR. Acima de cerca de 400 linhas alteradas, sem contar renomeações, lockfile e arquivos gerados, considere dividir.
- Trabalho em andamento vai como _draft_.

### Revisão

- Pelo menos uma aprovação de outra pessoa.
- Quem revisa executa o "Como testar" quando a mudança altera comportamento. Ler o diff não basta.
- Marque cada comentário como **bloqueante**, quando precisa mudar antes do merge, ou **sugestão**, quando fica a critério do autor.
- O prazo é curto: responda revisões no mesmo dia.

### Merge

- Só com aprovação, sem conflitos e com CI verde. O CI (`.github/workflows/ci.yml`) roda os mesmos comandos de "Antes de abrir" em toda PR, inclusive as empilhadas sobre outra branch, e constrói e testa a imagem Docker.
- Quem mescla é quem aprovou, nunca o autor.
- Use **Create a merge commit**, que preserva os commits feitos à mão. Não use _squash_ nem _rebase and merge_.
- Apague a branch depois do merge.

## Releases

1. Abra um PR de `develop` para `main` com o título `chore(release): release-X.Y.Z` e a lista do que entra.
2. Revise e mescle como qualquer outro PR.
3. Crie a tag no `main` atualizado:

```bash
git switch main
git pull
git tag release-X.Y.Z
git push origin release-X.Y.Z
```

Use versões `0.x.y` durante o desenvolvimento. A `release-1.0.0` é a versão entregue no Hackathon. Mantenha a mesma versão nos dois repositórios.

## Segredos e arquivos fora do git

- O `.env` nunca é commitado. O modelo versionado é o `.env.example`.
- Nada de tokens, PATs ou senhas reais em código, testes, documentação ou prints.
- Não versione `node_modules/`, `dist/` nem `coverage/`.
- Se um segredo for commitado por engano, avise o grupo na hora e revogue a credencial. Reescrever o histórico exige `push --force` e é decidido em grupo.

## Mudanças neste guia

Converse com o grupo antes. Alterações neste arquivo seguem o mesmo fluxo de PR.
