FROM node:20-slim

WORKDIR /app

# Install system dependencies for Playwright + ffmpeg
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    ffmpeg \
    curl \
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install Node dependencies (including playwright)
RUN npm install

# Install Playwright Chromium browser (Linux version)
RUN npx playwright install chromium --with-deps

# Copy source
COPY . .

EXPOSE 3456

ENV PORT=3456
ENV RENDER_PORT=3456

CMD ["node", "scripts/render-server.mjs"]
