import os
from dotenv import load_dotenv

# Load .env nhưng KHÔNG ghi đè environment variables từ Docker/system
load_dotenv(override=False)

# 1. API KEY OPENAI (đọc từ môi trường/.env, không hardcode)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
if not OPENAI_API_KEY:
    print("⚠️ CẢNH BÁO: Chưa tìm thấy OPENAI_API_KEY trong file .env hoặc hệ thống!")

# 2. CẤU HÌNH AI MODELS
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4.1")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-large")

# 3. DATABASE
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "5436"))
DB_NAME = os.getenv("DB_NAME", "guideline_management")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASS = os.getenv("DB_PASS", "postgres")
