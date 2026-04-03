#!/bin/bash
set -euo pipefail
exec > /var/log/ig-scheduler-setup.log 2>&1

echo "=== Installing Docker ==="
dnf update -y
dnf install -y docker git
systemctl enable docker
systemctl start docker

echo "=== Installing Docker Compose ==="
DOCKER_CONFIG=/usr/local/lib/docker
mkdir -p $DOCKER_CONFIG/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose

echo "=== Installing Node.js 20 ==="
dnf install -y nodejs20

echo "=== Cloning repo ==="
cd /opt
git clone https://github.com/UninstallInternet/social-media-farmer-bot.git app
cd /opt/app

echo "=== Creating .env ==="
ENCRYPTION_KEY=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
cat > .env << ENVEOF
DATABASE_URL=postgres://postgres:postgres@postgres:5432/instagram_scheduler
REDIS_URL=redis://redis:6379
S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=instagram-media
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_PUBLIC_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):9000/instagram-media
META_APP_ID=placeholder
META_APP_SECRET=placeholder
META_REDIRECT_URI=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000/api/auth/facebook/callback
ENCRYPTION_KEY=${ENCRYPTION_KEY}
APP_PASSWORD=changeme123
JWT_SECRET=${JWT_SECRET}
NEXT_PUBLIC_APP_URL=http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000
ENVEOF

echo "=== Adding app service to docker-compose ==="
cat >> docker-compose.yml << 'COMPOSEEOF'

  app:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio-setup:
        condition: service_completed_successfully
    restart: unless-stopped
COMPOSEEOF

echo "=== Building and starting ==="
docker compose up -d --build

echo "=== Setup complete ==="
echo "App will be available at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"
