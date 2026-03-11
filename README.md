# Document Platform

A serverless microservices platform for document management, built with Node.js and deployed on AWS Lambda via AWS SAM.

## Architecture

```
Client → API Gateway (port 4000) → Microservices
                                    ├── auth-service      (port 4001) → PostgreSQL
                                    ├── document-service  (port 4002) → PostgreSQL + S3 + SQS
                                    ├── analytics-service (port 4003) → PostgreSQL + Redis
                                    ├── user-service      (port 4005) → PostgreSQL + Redis
                                    └── worker-service    (port 4006) → SQS consumer
```

## Services

| Service | Port | Lambda Function | Responsibility |
|---|---|---|---|
| api-gateway | 4000 (HTTPS), 5000 (HTTP→redirect) | — | Reverse proxy, rate limiting, CORS |
| auth-service | 4001 | `doc-platform-auth` | JWT auth, OAuth (Google), MFA, RBAC |
| document-service | 4002 | `doc-platform-documents` | Upload/download docs, S3 storage, SQS producer |
| analytics-service | 4003 | `doc-platform-analytics` | Usage analytics and reporting |
| user-service | 4005 | `doc-platform-users` | User profile and role management |
| worker-service | 4006 | `doc-platform-worker` | SQS consumer — virus scan, notifications, analytics |

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- AWS CLI v2
- AWS SAM CLI (for serverless deployment)
- pnpm (for auth-service)

## Running Locally

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

Minimum required variables for local dev:

```env
DB_USER=postgres
DB_PASS=yourpassword
DB_NAME=document_platform
JWT_SECRET=<min_32_chars>
REFRESH_TOKEN_SECRET=<min_32_chars>
ENCRYPTION_KEY=<64_char_hex>
NODE_ENV=development
```

### 2. Start with Docker Compose

```bash
docker compose up --build
```

This starts all services plus PostgreSQL and Redis. The API gateway is available at:
- HTTPS: `https://localhost:4000` (requires TLS certs in `certs/`)
- HTTP: `http://localhost:5000` (redirects to HTTPS if certs present, otherwise serves directly on 4000)

### 3. Run a single service

```bash
# auth-service uses pnpm
cd auth-service && pnpm install && pnpm start

# all others use npm
cd document-service && npm install && npm start
```

### TLS certificates (local HTTPS)

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes -subj "/CN=localhost"
```

## Running Tests

```bash
# auth-service
cd auth-service
pnpm test:unit
pnpm test:integration

# document-service
cd document-service
npm run test:unit
npm run test:integration

# load test (requires k6 and a running deployment)
k6 run document-service/tests/load.test.js
```

## AWS Deployment

### Prerequisites

- S3 bucket for SAM artifacts (`SAM_DEPLOY_BUCKET`)
- S3 bucket for documents (`AWS_BUCKET`)
- SQS queue (`SQS_QUEUE_URL`, `SQS_QUEUE_ARN`)
- RDS PostgreSQL instance
- ElastiCache Redis instance

### Deploy with the script

```bash
# Ensure .env is populated with all production values (see .env.example)
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Validate all required environment variables
2. Install dependencies for each service
3. Run `sam build` (parallel, cached)
4. Run `sam deploy` with all parameters

### Manual SAM deploy

```bash
sam build --template template.yaml --cached --parallel

sam deploy \
  --stack-name document-platform \
  --s3-bucket <SAM_DEPLOY_BUCKET> \
  --region <AWS_REGION> \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    DbHost=<rds_endpoint> \
    DbUser=postgres \
    DbPass=<password> \
    DbName=document_platform \
    JwtSecret=<secret> \
    RefreshTokenSecret=<secret> \
    EncryptionKey=<64_char_hex> \
    AwsBucket=<bucket_name> \
    SqsQueueUrl=<queue_url> \
    SqsQueueArn=<queue_arn> \
    RedisUrl=redis://<elasticache_endpoint>:6379 \
    AllowedOrigins=https://yourdomain.com \
    GoogleClientId=<id> \
    GoogleClientSecret=<secret> \
    GoogleCallbackUrl=https://yourdomain.com/auth/google/callback \
    SmtpHost=<host> SmtpPort=587 SmtpUser=<user> SmtpPass=<pass>
```

After deploy, the API base URL is printed in the stack outputs:

```bash
aws cloudformation describe-stacks \
  --stack-name document-platform \
  --query "Stacks[0].Outputs" \
  --output table
```

## CI/CD (GitHub Actions)

Pipeline defined in `.github/workflows/ci.yml`:

| Job | Trigger | Description |
|---|---|---|
| test | push/PR | Unit + integration tests for `auth-service` and `document-service` |
| audit | push/PR | `npm audit` / `pnpm audit` for all services |
| deploy | push to `main` | Zips each service, uploads to S3, updates Lambda function code |
| migrate | after deploy | Runs Sequelize migrations via `auth-service` |
| load-test | after deploy | k6 load test against the deployed API |

### Required GitHub Secrets

```
AWS_ACCESS_KEY_ID       AWS_SECRET_ACCESS_KEY
DB_HOST                 DB_USER                 DB_PASS           DB_NAME
JWT_SECRET              REFRESH_TOKEN_SECRET    ENCRYPTION_KEY
AWS_BUCKET              DEPLOY_BUCKET           SQS_QUEUE_URL     SQS_QUEUE_ARN
REDIS_URL               ALLOWED_ORIGINS
GOOGLE_CLIENT_ID        GOOGLE_CLIENT_SECRET    GOOGLE_CALLBACK_URL
SMTP_HOST               SMTP_PORT               SMTP_USER         SMTP_PASS
LOAD_TEST_BASE_URL      LOAD_TEST_TOKEN
```

## Environment Variables Reference

See [`.env.example`](.env.example) for the full list with descriptions.

## Tech Stack

- **Runtime**: Node.js 20 (Lambda), Express.js
- **Database**: PostgreSQL 16 (Sequelize ORM)
- **Cache**: Redis 7
- **Storage**: AWS S3
- **Queue**: AWS SQS
- **Auth**: JWT, Google OAuth 2.0, TOTP MFA
- **Infra**: AWS SAM, AWS Lambda, API Gateway HTTP API
- **CI/CD**: GitHub Actions
