#!/bin/sh
set -eu

MOCK_BACKEND_PORT=${MOCK_BACKEND_PORT:-3001}
E2E_APP_PORT=${E2E_APP_PORT:-3000}
mock_backend_pid=
next_server_pid=

cleanup() {
  if [ -n "$next_server_pid" ]; then
    kill "$next_server_pid" 2>/dev/null || true
    wait "$next_server_pid" 2>/dev/null || true
  fi
  if [ -n "$mock_backend_pid" ]; then
    kill "$mock_backend_pid" 2>/dev/null || true
    wait "$mock_backend_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

MOCK_BACKEND_PORT="$MOCK_BACKEND_PORT" node -e '
  const net = require("node:net");
  const probe = net.createServer();
  probe.once("error", () => process.exit(1));
  probe.listen(Number(process.env.MOCK_BACKEND_PORT), "127.0.0.1", () => {
    probe.close(() => process.exit(0));
  });
'

MOCK_BACKEND_PORT="$MOCK_BACKEND_PORT" node e2e/mock-backend.js \
  >"/tmp/mock-backend-${MOCK_BACKEND_PORT}.log" 2>&1 &
mock_backend_pid=$!

MOCK_BACKEND_PORT="$MOCK_BACKEND_PORT" node -e '
  const net = require("node:net");
  const port = Number(process.env.MOCK_BACKEND_PORT);
  const deadline = Date.now() + 5000;
  const check = () => new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
  (async () => {
    while (Date.now() < deadline) {
      if (await check()) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    process.exitCode = 1;
  })();
'

MOCK_BACKEND_PORT="$MOCK_BACKEND_PORT" \
INCLUDE_LOCAL_API=1 \
NEXT_PUBLIC_API_URL="http://localhost:${MOCK_BACKEND_PORT}" \
NEXT_PUBLIC_ADSENSE_SLOT=0000000001 \
npm run build >"/tmp/next-build-${E2E_APP_PORT}.log" 2>&1

mkdir -p .next/standalone/.next/static .next/standalone/public
cp -R .next/static/. .next/standalone/.next/static/
cp -R public/. .next/standalone/public/

INCLUDE_LOCAL_API=1 \
NEXT_PUBLIC_API_URL="http://localhost:${MOCK_BACKEND_PORT}" \
PORT="$E2E_APP_PORT" \
node .next/standalone/server.js &
next_server_pid=$!
wait "$next_server_pid"
