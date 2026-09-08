#!/bin/zsh

set -eu

repository_dir="${0:A:h}"
dashboard_dir="$repository_dir/project-dashboard"
dashboard_url="http://127.0.0.1:3000/"

cd "$dashboard_dir"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "找不到 pnpm。請先安裝 Node.js 與 pnpm，再重新啟動。"
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "首次啟動，正在安裝看板套件..."
  pnpm install
fi

echo "醫療資料安全開發看板啟動中：$dashboard_url"
echo "要關閉看板，請在這個視窗按 Control+C。"

(
  for attempt in {1..60}; do
    if curl --silent --fail --max-time 1 "$dashboard_url" >/dev/null 2>&1; then
      open "$dashboard_url"
      exit 0
    fi
    sleep 0.5
  done
) &
browser_waiter_pid=$!

cleanup() {
  kill "$browser_waiter_pid" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM HUP

pnpm dev --hostname 127.0.0.1
