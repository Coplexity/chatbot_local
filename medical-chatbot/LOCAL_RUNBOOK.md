# Local Runbook - Chatbot Local

Tai lieu nay huong dan chay local repo `chatbot_local` gom 2 phan:

- `ai_documents_management`: PostgreSQL/pgvector database va guideline/document backend.
- `medical-chatbot`: frontend, NestJS backend, FastAPI chat-api.

Sau khi clone repo, cau truc can thay la:

```text
chatbot_local/
├── ai_documents_management/
└── medical-chatbot/
    ├── chat-api/
    ├── chat-backend/
    ├── chat-frontend/
    └── deploy/
```

## 1. Clone Va Mo Workspace

Clone repo:

```bash
git clone https://github.com/Coplexity/chatbot_local.git
cd chatbot_local
```

Neu dung VS Code, nen mo file workspace o root repo:

```bash
code chatbot_local.code-workspace
```

Hoac trong VS Code: `File > Open Workspace from File...` va chon `chatbot_local.code-workspace`.

Khi mo bang workspace file nay, Explorer se hien 2 folder chinh:

```text
ai_documents_management
medical-chatbot
```

## 2. Yeu Cau

- Docker Desktop dang chay.
- Docker Compose v2.
- Git.
- OpenAI API key neu muon test luong chat AI that.

## 3. Chay Database

Tu root repo `chatbot_local`:

```bash
cd ai_documents_management
cp .env.example .env
docker compose up -d db
docker compose ps
```

Thong tin database local:

```text
Host: localhost
Port: 5436
Database: guideline_management
User: postgres
Password: postgres
```

Kiem tra container DB:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

DB can o trang thai tuong tu:

```text
guideline-db   Up ... (healthy)   0.0.0.0:5436->5432/tcp
```

Quay lai root repo:

```bash
cd ..
```

## 4. Cau Hinh Medical Chatbot

Tu root repo `chatbot_local`:

```bash
cd medical-chatbot
cp deploy/.env.example deploy/.env
```

Mo file `medical-chatbot/deploy/.env` va cau hinh cac bien chinh:

```env
FRONTEND_PORT=8400

VITE_BACKEND_URL=http://chat-backend:3000
VITE_DOCUMENT_FILE_URL_TEMPLATE=http://localhost:8000/api/v1/documents/{documentId}/file
VITE_MAINTENANCE_MESSAGE=

DB_HOST=host.docker.internal
DB_PORT=5436
DB_NAME=guideline_management
DB_USER=postgres
DB_PASS=postgres
DB_SYNCHRONIZE=true
DB_LOGGING=false

JWT_SECRET=change_me_for_local_development

OPENAI_API_KEY=your_openai_key_here
LLM_MODEL=gpt-4.1
EMBEDDING_MODEL=text-embedding-3-large
```

Giai thich nhanh:

- `host.docker.internal`: cho phep container Docker goi ve database dang expose tren may host.
- `DB_PORT=5436`: port PostgreSQL cua `ai_documents_management`.
- `VITE_BACKEND_URL=http://chat-backend:3000`: frontend nginx proxy den NestJS backend trong Docker network.
- `DB_SYNCHRONIZE=true`: dung cho local de backend tu tao schema/table can thiet. Khi deploy production nen dat `false`.
- `OPENAI_API_KEY`: can key that neu muon test chat AI. Khong commit file `.env`.

## 5. Tao Docker Network

Repo dung external network ten `chatbot-db`.

Chay mot lan:

```bash
docker network create chatbot-db
```

Neu bao network da ton tai thi bo qua.

## 6. Chay Medical Chatbot

Tu root repo `chatbot_local`:

```bash
cd medical-chatbot/deploy
```

Lan dau, neu chua co image nao, co the build:

```bash
docker compose up -d --build
```

Luu y: build `chat-api` co the rat lau vi cai Python dependencies nang. Neu may da co image san hoac chi can start lai he thong, dung lenh nhanh hon:

```bash
docker compose up -d --no-build chat-api chat-backend chat-frontend
```

Neu vua sua `.env` va muon container an cau hinh moi:

```bash
docker compose up -d --no-build --force-recreate chat-api chat-backend chat-frontend
```

## 7. Kiem Tra He Thong

Kiem tra container:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Trang thai mong doi:

```text
medical-chatbot-chat-frontend-1   Up ... (healthy)   0.0.0.0:8400->80/tcp
medical-chatbot-chat-backend-1    Up ...
medical-chatbot-chat-api-1        Up ...             8000/tcp
guideline-db                      Up ... (healthy)   0.0.0.0:5436->5432/tcp
```

Kiem tra frontend:

```bash
curl http://localhost:8400/health
```

Ket qua mong doi:

```text
healthy
```

Kiem tra backend qua frontend nginx proxy:

```bash
curl http://localhost:8400/api/health
```

Ket qua mong doi:

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

Mo ung dung:

```text
http://localhost:8400
```

## 8. Xem Logs

Tu root repo `chatbot_local`.

Log frontend:

```bash
cd medical-chatbot/deploy
docker compose logs -f chat-frontend
```

Log backend:

```bash
cd medical-chatbot/deploy
docker compose logs -f chat-backend
```

Log chat-api:

```bash
cd medical-chatbot/deploy
docker compose logs -f chat-api
```

Log database:

```bash
cd ai_documents_management
docker compose logs -f db
```

## 9. Chay Guideline Backend Neu Can File Document

Neu frontend can mo file tai lieu qua URL `http://localhost:8000/api/v1/documents/{documentId}/file`, can chay guideline backend trong `ai_documents_management`.

Tu root repo `chatbot_local`:

```bash
cd ai_documents_management
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

Hoac neu da co `.venv` va dependencies:

```bash
cd ai_documents_management
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger guideline backend:

```text
http://localhost:8000/docs
```

## 10. Tat He Thong

Tat medical chatbot:

```bash
cd medical-chatbot/deploy
docker compose down
```

Tat database/guideline services:

```bash
cd ai_documents_management
docker compose down
```

Chi reset sach database local khi chac chan khong can du lieu cu:

```bash
cd ai_documents_management
docker compose down -v
```

## 11. Loi Thuong Gap

### Frontend restart voi loi `host not found in upstream`

Neu log frontend co loi:

```text
host not found in upstream "medical-chatbot-chat-backend-1"
```

Sua `medical-chatbot/deploy/.env`:

```env
VITE_BACKEND_URL=http://chat-backend:3000
```

Sau do recreate:

```bash
cd medical-chatbot/deploy
docker compose up -d --no-build --force-recreate chat-frontend chat-backend
```

### Backend bao `database "db" does not exist`

Nguyen nhan: `DB_NAME` dang sai hoac container chua an `.env` moi.

Sua `medical-chatbot/deploy/.env`:

```env
DB_HOST=host.docker.internal
DB_PORT=5436
DB_NAME=guideline_management
DB_USER=postgres
DB_PASS=postgres
```

Sau do recreate:

```bash
cd medical-chatbot/deploy
docker compose up -d --no-build --force-recreate chat-backend chat-api
```

### `docker compose up -d --build` doi qua lau

Nguyen nhan thuong la `chat-api` dang cai Python dependencies nang.

Neu container/image da co san va chi muon chay lai:

```bash
cd medical-chatbot/deploy
docker compose up -d --no-build chat-api chat-backend chat-frontend
```

### Backend health tra database down

Kiem tra DB co chay khong:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Can thay:

```text
guideline-db   Up ... (healthy)   0.0.0.0:5436->5432/tcp
```

Neu DB chua chay:

```bash
cd ai_documents_management
docker compose up -d db
```

### Chat AI loi khi gui cau hoi

Kiem tra `OPENAI_API_KEY` trong `medical-chatbot/deploy/.env`.

Sau khi sua key:

```bash
cd medical-chatbot/deploy
docker compose up -d --no-build --force-recreate chat-api
```

## 12. Lenh Nhanh Hang Ngay

Tu root repo `chatbot_local`.

Start database:

```bash
cd ai_documents_management
docker compose up -d db
cd ..
```

Start medical chatbot:

```bash
cd medical-chatbot/deploy
docker compose up -d --no-build chat-api chat-backend chat-frontend
cd ../..
```

Check health:

```bash
curl http://localhost:8400/health
curl http://localhost:8400/api/health
```

Open app:

```text
http://localhost:8400
```

Stop all:

```bash
cd medical-chatbot/deploy
docker compose down
cd ../..

cd ai_documents_management
docker compose down
cd ..
```