# 4frames-web-app

Frontend (React + TypeScript + Vite) do 4Frames — conversão de vídeo em frames (`.zip`).
Consome a API em [4frames-core-api](../4frames-core-api).

Para a arquitetura de código (estrutura de features, convenções, fluxo do produto),
ver [CLAUDE.md](./CLAUDE.md).

## Pré-requisitos

- Node.js 24 (ver `.nvmrc`) e pnpm 10 (fixado em `packageManager`), os mesmos do core-api

## Desenvolvimento

```bash
cp .env.example .env   # aponta VITE_API_URL para a API (padrão http://localhost:3000)
pnpm install
pnpm dev
```

A API (4frames-core-api) precisa estar rodando (com Postgres e LocalStack) para o
login e a conversão funcionarem — ver o README daquele projeto.

## Fluxo

1. `/login` — autenticação por email/senha (sessão em `localStorage`, compartilhada entre abas).
2. `/convert` — selecionar ou arrastar **um ou mais** vídeos (`.mp4` ou `.mov`) e clicar em **Converter**.
   Cada arquivo gera um job na API (upload direto ao S3 + confirmação).
3. `/my-videos` — listagem paginada dos jobs do usuário.
4. `/jobs/:jobId` — detalhe de um job (link compartilhável), progresso SSE, cancelamento e download do `.zip` quando `DONE`.

## Comandos

```bash
pnpm dev              # servidor de desenvolvimento
pnpm test             # roda os testes (Vitest)
pnpm lint             # eslint
pnpm format           # prettier (format:check só verifica)
pnpm exec tsc -b      # type-check
pnpm build            # type-check + build de produção
```
