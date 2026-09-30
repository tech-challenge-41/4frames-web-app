#!/usr/bin/env bash
# Sobe a imagem do front e confere o que o cluster espera dela: /healthz para as probes, as rotas da SPA
# devolvendo o index.html, um asset inexistente com 404 e o processo sem root.
# Uso: smoke-web-image.sh <imagem>
set -euo pipefail

IMAGE="${1:?imagem}"
NAME="web-smoke-$$"
PORT="${SMOKE_PORT:-18080}"

docker run -d --rm --name "$NAME" -p "$PORT:8080" "$IMAGE" >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT

BASE="http://127.0.0.1:$PORT"
for _ in $(seq 1 30); do
  curl -fsS "$BASE/healthz" >/dev/null 2>&1 && break
  sleep 1
done

expect() {
  local path="$1" status="$2" type="$3" got
  got=$(curl -s -o /dev/null -w '%{http_code} %{content_type}' "$BASE$path")
  if [[ "$got" != "$status $type"* ]]; then
    echo "FALHOU $path: esperado '$status $type', veio '$got'" >&2
    exit 1
  fi
  echo "ok  $path -> $got"
}

expect /healthz 200 text/plain
expect / 200 text/html
expect /my-videos 200 text/html
expect /jobs/123e4567-e89b-12d3-a456-426614174000 200 text/html
expect /assets/nao-existe.js 404 text/html

user=$(docker exec "$NAME" id -u)
if [[ "$user" == "0" ]]; then
  echo "FALHOU: o nginx roda como root" >&2
  exit 1
fi
echo "ok  processo com uid $user"
