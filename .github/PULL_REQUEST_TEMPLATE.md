<!--
Base: develop. Só o PR de release usa main.
Título no formato de commit, por exemplo: feat(videos): tela meus vídeos
Regras completas em CONTRIBUTING.md.
-->

## O que muda

<!-- Uma a três frases. Cite o card, se houver. -->

## Por que

<!-- O problema ou requisito que motivou a mudança. -->

## Como testar

<!-- Passos para quem revisa reproduzir: comandos, telas, usuário de teste, versão da API necessária. -->

## Prints

<!-- Obrigatório para mudanças visuais. Apague a seção se não houver. -->

## Checklist do autor

- [ ] A base do PR é `develop`
- [ ] Título e commits seguem Conventional Commits
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm exec tsc -b`, `pnpm test` e `pnpm build` passam localmente
- [ ] CI verde, quando o workflow existir
- [ ] Testes novos ou atualizados cobrem a mudança
- [ ] Contrato com a API conferido, se mudou o que o front espera
- [ ] `README.md`, `CLAUDE.md` e `.env.example` atualizados, se aplicável
- [ ] Nenhum `.env`, token ou senha real no diff
- [ ] Li o diff inteiro e fiz os commits à mão, inclusive onde a IA escreveu código

## Checklist de revisão

- [ ] Revisado e aprovado por outra pessoa
- [ ] "Como testar" executado por quem revisou, quando a mudança altera comportamento
- [ ] Merge feito por quem aprovou, com merge commit
