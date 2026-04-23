# AI4Life Chatbot

A multi-service medical chatbot platform with a web frontend, a core backend API, and a dedicated chat streaming service.

## Repository Structure

```text
.
├── backend/      # Main NestJS API
├── chat-api/     # FastAPI chat streaming service
├── deploy/       # Docker Compose and deployment config samples
├── frontend/     # React + Vite frontend
└── README.md
```

## Architecture

```text
Browser
  └─> Frontend (Nginx, :8080)
        └─> Backend API (NestJS, :3008)

External chat clients / integrations
  └─> Chat API (FastAPI, :8003 -> container :8000)

Backend + Chat API
  ├─> PostgreSQL
  └─> Redis
```

## Tech Stack

### Frontend

- React 19
- Vite
- TypeScript
- Nginx

### Backend

- NestJS
- PostgreSQL
- Redis
- YAML-based runtime configuration

### Chat API

- FastAPI
- Python 3.11
- OpenAI-based integration

### Infrastructure

- Docker
- Docker Compose

## Getting Started

### Prerequisites

- Docker Engine 24+
- Docker Compose v2
- Recommended minimum: 2 CPU cores, 4 GB RAM

### Prepare environment files

```bash
cp deploy/.env.example deploy/.env
cp deploy/backend.config.example.yml deploy/backend.config.yml
```

## Configuration

Update `deploy/.env` with the values required for your environment.

Important variables include:

- `POSTGRES_PASSWORD`
- `OPENAI_API_KEY`
- `VITE_DOCUMENT_FILE_URL_TEMPLATE`
- `VITE_MAINTENANCE_MESSAGE`
- `CHAT_API_DB_*`

Update `deploy/backend.config.yml` as needed:

- `db.*`
- `cors.allowedOrigins`
- `ragDatabase.url`

## Running the Project

### Start the full stack

```bash
cd deploy
docker compose --env-file .env up -d --build
```

### Check service status

```bash
docker compose ps
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f chat-api
```

### Stop the stack

```bash
cd deploy
docker compose down
```

### Stop and remove persisted volumes

```bash
cd deploy
docker compose down -v
```

## Available Endpoints

- Frontend: `http://localhost:8080`
- Backend API base: `http://localhost:3008/api`
- Chat API health: `http://localhost:8003/health`
- Chat API stream: `http://localhost:8003/api/chat/stream`

## Deployment Notes

- The frontend proxies API requests through `VITE_BACKEND_URL`; inside Docker the default is `http://backend:3008`.
- The backend mounts `deploy/backend.config.yml` at runtime.
- The chat API uses environment variables directly for OpenAI and database configuration.
- Do not commit real secret files such as `deploy/.env`.

Deployment assets available in this repository:

- `deploy/docker-compose.yml`
- `deploy/.env.example`
- `deploy/backend.config.example.yml`




