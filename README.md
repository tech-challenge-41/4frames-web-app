# 4frames-web-app

Frontend (React + TypeScript + Vite) do 4Frames — conversão de vídeo em frames (`.zip`).
Consome a API em [4frames-core-api](../4frames-core-api).

Para a arquitetura de código (estrutura de features, convenções, fluxo do produto),
ver [CLAUDE.md](./CLAUDE.md).

## Desenvolvimento

```bash
cp .env.example .env   # aponta VITE_API_URL para a API (padrão http://localhost:3000)
pnpm install
pnpm dev
```

A API (4frames-core-api) precisa estar rodando (com Postgres e LocalStack) para o
login e a conversão funcionarem — ver o README daquele projeto.

## Fluxo

1. `/login` — autenticação por email/senha.
2. `/convert` — selecionar/arrastar um vídeo (`.mp4` ou `.mov`) e clicar em **Converter**.
   Isso cria o job na API, envia o arquivo direto ao S3 e confirma o upload.
3. `/jobs/:jobId` — página de status do job, criada automaticamente após o envio.
   O link é compartilhável. Mostra o status em tempo quase real (poll a cada 3s) e
   libera o download do `.zip` quando o job estiver `DONE`.

## Comandos

```bash
pnpm dev              # servidor de desenvolvimento
pnpm test             # roda os testes (Vitest)
pnpm lint             # eslint
pnpm format           # prettier (format:check só verifica)
pnpm exec tsc -b      # type-check
pnpm build            # type-check + build de produção
```

## Limitações atuais

A API ainda não implementa o processamento de vídeo (worker), a listagem de jobs do
usuário nem o endpoint de download do `.zip` — ver "Known gaps" em
[CLAUDE.md](./CLAUDE.md) para o estado exato do contrato assumido pelo front.
