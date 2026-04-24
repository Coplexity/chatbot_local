# Medical Chatbot

A multi-service medical chatbot with a React frontend, NestJS backend API, and FastAPI chat streaming service.

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
  └─> Frontend (Nginx, host :8400 -> container :80)
        └─> Backend API (NestJS, internal :3000)

External chat clients / integrations
  └─> Chat API (FastAPI, internal :8000)

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

Copy the sample environment file:

```bash
cp deploy/.env.example deploy/.env
```

Optionally copy the backend config if you need file-based overrides:

```bash
cp deploy/backend.config.example.yml deploy/backend.config.yml
```

## Configuration

Edit `deploy/.env` for local values, public ports, and secrets. Use `deploy/backend.config.yml` only when you need to override backend settings from a mounted config file.

## Running the Project

### Start services

```bash
cd deploy
docker compose up -d --build
```

### Check status and logs

```bash
docker compose ps
docker compose logs -f frontend
docker compose logs -f backend
docker compose logs -f chat-api
```

### Stop services

```bash
cd deploy
docker compose down
```

## Deployment Notes

- The frontend proxies API requests through `VITE_BACKEND_URL`; inside Docker it defaults to `http://backend:3000`.
- `deploy/backend.config.yml` is mounted as `/app/config/config.yml`; environment variables override it when provided.
- The chat API uses environment variables directly for OpenAI and database configuration.
- Do not commit real secret files such as `deploy/.env`.

Deployment assets available in this repository:

- `deploy/docker-compose.yml`
- `deploy/.env.example`
- `deploy/backend.config.example.yml`
