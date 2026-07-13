FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/alembic/versions

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head 2>/dev/null; python seed.py 2>/dev/null; uvicorn app.main:app --host 0.0.0.0 --port 8000"]
