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
   Cada arquivo gera um job na API (upload direto ao S3 + confirmação), com uma barra de progresso própria durante
   o envio.
3. `/my-videos` — listagem paginada dos jobs do usuário.
4. `/jobs/:jobId` — detalhe de um job (link compartilhável), progresso SSE, cancelamento e download do `.zip` quando `DONE`.

## Comandos

```bash
pnpm dev              # servidor de desenvolvimento
pnpm test             # roda os testes (Vitest)
pnpm test:coverage    # testes com cobertura; falha abaixo dos limites do vite.config.ts
pnpm lint             # eslint
pnpm format           # prettier (format:check só verifica)
pnpm exec tsc -b      # type-check
pnpm build            # type-check + build de produção
```

## Imagem de produção

O `Dockerfile` faz o build do Vite em `node:24-alpine` e serve o `dist` com nginx sem root
(`nginxinc/nginx-unprivileged`), na porta **8080**. A configuração fica em `nginx/default.conf`:

- rotas da SPA (`/my-videos`, `/jobs/:jobId`…) caem no `index.html`;
- `/assets/`, com hash no nome, tem cache de um ano, e um asset inexistente devolve 404;
- `GET /healthz` responde às probes do Kubernetes.

```bash
docker build -t 4frames-web .
docker run --rm -p 8081:8080 4frames-web   # http://localhost:8081/healthz
```

O `VITE_API_URL` é um `ARG` de build. O Vite o embute no JavaScript, então ele não muda depois que a imagem
está pronta. O padrão é **`/api`**, um caminho relativo: o navegador chama a API no mesmo endereço que serviu
o front, e no cluster o Ingress leva `/api` à API. Assim a mesma imagem funciona em qualquer host.

Para usar a imagem fora do Ingress, passe um endereço absoluto e libere a origem do front no `CORS_ORIGIN`
da API:

```bash
docker build --build-arg VITE_API_URL=http://localhost:3000 -t 4frames-web .
```

No cluster local, o `scripts/k8s-local.sh` do core-api constrói esta imagem a partir deste clone, que deve
estar ao lado do `4frames-core-api`, e a serve em http://localhost:8080.

## CI/CD (GitHub Actions)

- **CI** (`.github/workflows/ci.yml`), em toda PR, inclusive as empilhadas sobre outra branch, e em push para
  `develop`/`main`: `test` (Vitest com o gate de cobertura de `vite.config.ts`) → `lint` (ESLint e Prettier) →
  `type-check` (`tsc -b`) → `build` (Vite e a imagem Docker, sem push, com o smoke abaixo).
- **CD** (`.github/workflows/cd.yml`), em tag `release-*`: constrói a imagem, roda o smoke e publica
  `ghcr.io/tech-challenge-41/4frames-web:<tag>` no GHCR.

O smoke (`.github/scripts/smoke-web-image.sh`) sobe a imagem e confere `/healthz`, as rotas da SPA devolvendo o
`index.html`, o 404 de um asset inexistente e o processo sem root. Para rodar localmente:

```bash
docker build -t 4frames-web:ci .
bash .github/scripts/smoke-web-image.sh 4frames-web:ci
```
