#!/usr/bin/env bash
set -euo pipefail

# ── Load env ──────────────────────────────────────────────────────────────────
if [ -f .env ]; then
  set -a; source .env; set +a
fi

# ── Validate required vars ────────────────────────────────────────────────────
REQUIRED=(
  DB_HOST DB_USER DB_PASS DB_NAME
  JWT_SECRET REFRESH_TOKEN_SECRET ENCRYPTION_KEY
  AWS_BUCKET SQS_QUEUE_URL SQS_QUEUE_ARN
  REDIS_URL SAM_DEPLOY_BUCKET AWS_REGION
  GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_CALLBACK_URL
  SMTP_HOST SMTP_PORT SMTP_USER SMTP_PASS
)
for var in "${REQUIRED[@]}"; do
  [ -z "${!var:-}" ] && { echo "ERROR: $var is not set"; exit 1; }
done

# ── Install dependencies for each service ────────────────────────────────────
SERVICES=(auth-service document-service analytics-service user-service worker-service)
for svc in "${SERVICES[@]}"; do
  echo "▶ Installing $svc..."
  if [ -f "$svc/pnpm-lock.yaml" ]; then
    pnpm install --frozen-lockfile -C "$svc"
  else
    npm ci --prefix "$svc"
  fi
done

# ── SAM Build ─────────────────────────────────────────────────────────────────
echo "▶ SAM Build..."
sam build --template template.yaml --cached --parallel

# ── SAM Deploy ────────────────────────────────────────────────────────────────
echo "▶ SAM Deploy..."
sam deploy \
  --stack-name document-platform \
  --s3-bucket "$SAM_DEPLOY_BUCKET" \
  --region "$AWS_REGION" \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --parameter-overrides \
    DbHost="$DB_HOST" \
    DbUser="$DB_USER" \
    DbPass="$DB_PASS" \
    DbName="$DB_NAME" \
    JwtSecret="$JWT_SECRET" \
    RefreshTokenSecret="$REFRESH_TOKEN_SECRET" \
    EncryptionKey="$ENCRYPTION_KEY" \
    AwsBucket="$AWS_BUCKET" \
    SqsQueueUrl="$SQS_QUEUE_URL" \
    SqsQueueArn="$SQS_QUEUE_ARN" \
    RedisUrl="$REDIS_URL" \
    AllowedOrigins="${ALLOWED_ORIGINS:-https://yourdomain.com}" \
    GoogleClientId="$GOOGLE_CLIENT_ID" \
    GoogleClientSecret="$GOOGLE_CLIENT_SECRET" \
    GoogleCallbackUrl="$GOOGLE_CALLBACK_URL" \
    SmtpHost="$SMTP_HOST" \
    SmtpPort="$SMTP_PORT" \
    SmtpUser="$SMTP_USER" \
    SmtpPass="$SMTP_PASS"

echo "✅ Deploy complete."
aws cloudformation describe-stacks \
  --stack-name document-platform \
  --region "$AWS_REGION" \
  --query "Stacks[0].Outputs" \
  --output table
