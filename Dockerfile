# Imagem de produção do front: o build do Vite servido por nginx sem root, na porta 8080.
#   docker build -t 4frames-web .
#
# VITE_API_URL é lido no build e fica embutido no JavaScript. O padrão /api é relativo: o navegador chama a
# API no mesmo endereço que serviu o front, e no cluster o Ingress leva /api à API. Assim a mesma imagem
# funciona em qualquer host.

FROM node:24-alpine AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# Manifests primeiro, para reaproveitar o cache da instalação quando só o código muda.
COPY package.json pnpm-lock.yaml ./
# --ignore-scripts: o único script de instalação é o `prepare` do Husky, que não tem uso sem o .git.
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
# ARG chega ao `pnpm build` como variável de ambiente, que o Vite prefere a qualquer arquivo .env.
ARG VITE_API_URL=/api
RUN pnpm build

FROM nginxinc/nginx-unprivileged:1.30-alpine AS runtime
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
