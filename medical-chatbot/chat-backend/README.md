# Medical Chatbot Backend

NestJS API service for the AI4Life medical chatbot platform.

## Environment Variables

The backend reads runtime configuration from `config/config.yml` and supports environment variable overrides for local development and container deployments.

### Backend app

| Variable | Description | Example |
| --- | --- | --- |
| `APP_NAME` | Display name of the backend service. | `Medical Chatbot` |
| `APP_PORT` | HTTP port that the NestJS server listens on. | `3000` |

### JWT

| Variable | Description | Example |
| --- | --- | --- |
| `JWT_ALGORITHM` | JWT signing algorithm. Use `HS256` for shared-secret signing or an asymmetric algorithm when key paths are configured. | `HS256` |
| `JWT_EXPIRES_IN` | Access token lifetime using the supported duration format. | `2880m` |
| `JWT_SECRET` | Secret used for symmetric JWT signing. Keep this value private. | `change_me` |
| `JWT_PRIVATE_KEY_PATH` | Path to the private key file for asymmetric JWT signing. | `/run/secrets/jwt-private.pem` |
| `JWT_PUBLIC_KEY_PATH` | Path to the public key file for asymmetric JWT verification. | `/run/secrets/jwt-public.pem` |

### CORS

| Variable | Description | Example |
| --- | --- | --- |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of frontend origins allowed to call the backend. Leave empty only for environments where the config file supplies the value. | `http://localhost:8400,https://app.example.com` |
| `CORS_ALLOW_CREDENTIALS` | Whether browsers may send credentials such as cookies and authorization headers in cross-origin requests. | `true` |

### Database

| Variable | Description | Example |
| --- | --- | --- |
| `DB_HOST` | Preferred backend database host override. | `postgres` |
| `DB_PORT` | Preferred backend database port override. | `5432` |
| `DB_NAME` | Preferred backend database name override. | `medical-chatbot` |
| `DB_USER` | Preferred backend database username override. | `ai4life` |
| `DB_PASS` | Preferred backend database password override. Keep this value private. | `change_me` |
| `DB_SYNCHRONIZE` | Enables TypeORM schema synchronization. Keep `false` outside disposable development databases. | `false` |
| `DB_LOGGING` | Enables database query logging. | `false` |

### Redis

| Variable | Description | Example |
| --- | --- | --- |
| `REDIS_HOST` | Redis host used by the backend. | `redis` |
| `REDIS_PORT` | Redis port used by the backend. | `6379` |

### Mailer

| Variable | Description | Example |
| --- | --- | --- |
| `MAILER_HOST` | SMTP server hostname. | `smtp.example.com` |
| `MAILER_PORT` | SMTP server port. | `587` |
| `MAILER_SECURE` | Whether to use TLS for the SMTP connection. | `false` |
| `MAILER_USER` | SMTP authentication username. | `notifications@example.com` |
| `MAILER_PASS` | SMTP authentication password. Keep this value private. | `change_me` |
| `MAILER_FROM` | Default sender address for backend emails. | `AI4Life <notifications@example.com>` |

### Chat API integration

| Variable | Description | Example |
| --- | --- | --- |
| `CHAT_API_URL` | Base URL of the FastAPI chat streaming service. | `http://localhost:8000` |

### OAuth

| Variable | Description | Example |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID. | `your-google-client-id` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret. Keep this value private. | `change_me` |
| `GOOGLE_CALLBACK_URL` | Google OAuth redirect URL registered with Google Cloud. | `http://localhost:3000/auth/google/callback` |
| `GOOGLE_SCOPE` | Space-separated Google OAuth scopes requested during sign-in. | `email profile` |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID. | `your-github-client-id` |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret. Keep this value private. | `change_me` |
| `GITHUB_CALLBACK_URL` | GitHub OAuth redirect URL registered with GitHub. | `http://localhost:3000/auth/github/callback` |
| `GITHUB_SCOPE` | Space-separated GitHub OAuth scopes requested during sign-in. | `user:email` |
