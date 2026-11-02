#!/usr/bin/env bash
# LongevityAI — craft CLI binary'lerini konteyner imajına indirir (build aşaması).
# Kaynak: storytold GitHub release'leri (resmi linux-aarch64/x86_64 tar.gz).
# Yalnızca headless CLI binary'leri alınır; GUI uygulaması ve share/ atılır.
#
# Kullanım: scripts/fetch-craft-cli.sh <hedef-dizin>
#   hedef-dizin varsayılan: /app/bin
set -euo pipefail

VECTORCRAFT_VERSION="${VECTORCRAFT_VERSION:-0.19.0}"
PHOTOCRAFT_VERSION="${PHOTOCRAFT_VERSION:-0.18.0}"
DEST="${1:-/app/bin}"

ARCH="$(uname -m)"
case "$ARCH" in
  aarch64|arm64) ARCH="aarch64" ;;
  x86_64|amd64)  ARCH="x86_64" ;;
  *) echo "Desteklenmeyen mimari: $ARCH" >&2; exit 1 ;;
esac

mkdir -p "$DEST"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

fetch_cli() {
  local repo="$1" version="$2" binary="$3"
  local url="https://github.com/storytold/${repo}/releases/download/v${version}/${repo}-${version}-linux-${ARCH}.tar.gz"
  echo "→ ${binary} indiriliyor (${repo} v${version}, ${ARCH})"
  curl -fsSL "$url" -o "$TMP/pkg.tar.gz"
  tar xzf "$TMP/pkg.tar.gz" -C "$TMP" --strip-components=1
  cp "$TMP/bin/${binary}" "$DEST/${binary}"
  chmod +x "$DEST/${binary}"
  echo "  ✓ $DEST/${binary}"
}

fetch_cli "vectorcraft" "$VECTORCRAFT_VERSION" "vectorcraft-cli"
fetch_cli "photocraft" "$PHOTOCRAFT_VERSION" "photocraft-cli"

echo "✓ craft CLI'lar hazır."
