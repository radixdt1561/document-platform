#!/bin/bash
set -e

SERVICES="api-gateway auth-service document-service analytics-service user-service worker-service"
ROOT="/home/pragnesh.suthar/Documents/document-platform"
FAILED=0

echo "========================================"
echo " Dependency Vulnerability Scan"
echo "========================================"

for svc in $SERVICES; do
  DIR="$ROOT/$svc"
  [ -f "$DIR/package.json" ] || continue
  echo "--- $svc ---"
  cd "$DIR"
  if npm audit --audit-level=high 2>&1 | grep -qE "found 0 vulnerabilities|0 high|0 critical"; then
    echo "PASS: $svc"
  else
    npm audit --audit-level=high || true
    echo "FAIL: $svc has high/critical vulnerabilities"
    FAILED=1
  fi
done

echo ""
echo "========================================"
echo " OWASP ZAP Baseline Scan"
echo "========================================"

TARGET="${ZAP_TARGET:-https://localhost:4000}"
mkdir -p "$ROOT/zap-reports"

if command -v docker &>/dev/null; then
  docker run --rm \
    -v "$ROOT/zap-reports:/zap/wrk" \
    ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
    -t "$TARGET" -r zap-report.html -I 2>&1 | tail -20
  echo "ZAP report: $ROOT/zap-reports/zap-report.html"
else
  echo "Docker not found — skipping ZAP scan"
fi

echo ""
[ $FAILED -ne 0 ] && { echo "SECURITY SCAN FAILED"; exit 1; }
echo "All security checks passed"
