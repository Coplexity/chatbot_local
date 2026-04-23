FROM python:3.11-slim

# Working directory
WORKDIR /app

# Install basic system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire codebase into the container
COPY . .

# Note: No model preload is needed because the service uses the OpenAI API
# OpenAI embeddings are fetched through the API, so no local cache is required

# Expose port (optional, mainly for docker-compose)
EXPOSE 8000

# Default API startup command
CMD ["uvicorn", "app.api:app", "--host", "0.0.0.0", "--port", "8000"]
