# Backend Dockerfile
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies including compilers for code execution
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    default-jdk \
    libpq-dev \
    nodejs \
    npm \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn daphne

# Copy project
COPY . .

# Create directory for temp code execution
RUN mkdir -p /tmp/code_execution && chmod 777 /tmp/code_execution

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Run with Daphne for WebSocket support
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
