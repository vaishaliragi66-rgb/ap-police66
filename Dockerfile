FROM python:3.11-slim

# Install Node.js
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server files
COPY server/ ./server/

# Install Python dependencies
WORKDIR /app/server
RUN pip install --no-cache-dir -r requirements.txt

# Install Node dependencies
RUN npm install

# Expose port
EXPOSE 5200

# Start server
CMD ["node", "server.js"]
