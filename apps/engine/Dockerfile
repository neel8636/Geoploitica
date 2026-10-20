FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

COPY pyproject.toml README.md ./
COPY geopolitica_engine ./geopolitica_engine

RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir .

EXPOSE 8000

CMD ["sh", "-c", "uvicorn geopolitica_engine.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
