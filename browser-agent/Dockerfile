# Browser Agent Service Dockerfile
FROM python:3.11-slim

# Install system dependencies for browser automation
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    curl \
    unzip \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers
RUN playwright install chromium
RUN playwright install-deps chromium

# Copy application code
COPY browser_agent_service.py .

# Create a non-root user
RUN useradd -m -s /bin/bash browseruser && \
    chown -R browseruser:browseruser /app

# Switch to non-root user
USER browseruser

# Expose the WebSocket port
EXPOSE 8001

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the service
CMD ["uvicorn", "browser_agent_service:app", "--host", "0.0.0.0", "--port", "8001", "--reload"]
