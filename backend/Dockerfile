FROM python:3.10-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies first for layer caching
COPY pyproject.toml uv.lock .python-version ./
RUN UV_PYTHON_PREFERENCE=system uv sync --no-dev --no-install-project

# Copy application code
COPY backend/ backend/
COPY main.py .

EXPOSE 8001

CMD ["uv", "run", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8001"]
