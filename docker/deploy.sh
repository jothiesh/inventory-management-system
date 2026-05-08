#!/bin/bash

# =============================================
#  STORE WEBSITE - DEPLOY SCRIPT
#  Usage: ./deploy.sh
#  First time: ./deploy.sh --fresh
# =============================================

set -e

STORE_DIR="/home/ec2-user/store/inventory-management-system"
LOG_FILE="/home/ec2-user/store/deploy.log"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✅ $1${NC}"; echo "[$(date)] $1" >> "$LOG_FILE"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠️  $1${NC}"; echo "[$(date)] WARN: $1" >> "$LOG_FILE"; }
fail() { echo -e "${RED}[$(date '+%H:%M:%S')] ❌ $1${NC}"; echo "[$(date)] ERROR: $1" >> "$LOG_FILE"; exit 1; }

echo ""
echo "========================================="
echo "   🏪 STORE WEBSITE DEPLOYMENT"
echo "========================================="
echo ""

# ------------------------------------------
# Step 1: Go to project directory
# ------------------------------------------
cd "$STORE_DIR" || fail "Directory not found: $STORE_DIR"
log "In project directory: $STORE_DIR"

# ------------------------------------------
# Step 2: Check required files exist
# ------------------------------------------
for file in docker-compose.yml Dockerfile.backend Dockerfile.frontend nginx.conf; do
    if [ ! -f "$file" ]; then
        fail "Missing file: $file"
    fi
done
log "All required files found"

# Check directories exist
for dir in backend frontend; do
    if [ ! -d "$dir" ]; then
        fail "Missing directory: $dir"
    fi
done
log "Backend and frontend directories found"

# ------------------------------------------
# Step 3: Stop old containers (if running)
# ------------------------------------------
log "Stopping old containers..."
docker compose down --remove-orphans 2>/dev/null || docker-compose down --remove-orphans 2>/dev/null || true
sleep 3
log "Old containers stopped"

# ------------------------------------------
# Step 4: Free ports if stuck
# ------------------------------------------
for port in 80 3001 3307; do
    if sudo lsof -i :$port -t > /dev/null 2>&1; then
        warn "Port $port is busy, killing process..."
        sudo fuser -k $port/tcp 2>/dev/null || true
        sleep 2
    fi
done
log "Ports 80, 3001, 3307 are free"

# ------------------------------------------
# Step 5: Clean old images (optional on --fresh)
# ------------------------------------------
if [ "$1" == "--fresh" ]; then
    log "Fresh build requested, removing old images..."
    docker image prune -af 2>/dev/null || true
    docker volume prune -f 2>/dev/null || true
    log "Old images and volumes cleaned"
fi

# ------------------------------------------
# Step 6: Build and Start
# ------------------------------------------
log "Building and starting containers..."
docker compose up -d --build 2>/dev/null || docker-compose up -d --build
log "Containers starting..."

# ------------------------------------------
# Step 7: Wait for health checks
# ------------------------------------------
echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for Database (max 60 seconds)
echo -n "  Database: "
for i in $(seq 1 60); do
    if docker exec store-db mysqladmin ping -h localhost -u root -pStoreRoot@2026 --silent 2>/dev/null; then
        echo -e "${GREEN}Ready ✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 60 ]; then
        echo -e "${RED}Timeout ❌${NC}"
        warn "Database took too long, checking logs..."
        docker logs store-db --tail 20
    fi
done

# Wait for Backend (max 120 seconds)
echo -n "  Backend:  "
for i in $(seq 1 120); do
    if curl -sf http://localhost:3001/actuator/health > /dev/null 2>&1; then
        echo -e "${GREEN}Ready ✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 120 ]; then
        echo -e "${RED}Timeout ❌${NC}"
        warn "Backend took too long, checking logs..."
        docker logs store-backend --tail 30
    fi
done

# Wait for Frontend (max 30 seconds)
echo -n "  Frontend: "
for i in $(seq 1 30); do
    if curl -sf http://localhost:80 > /dev/null 2>&1; then
        echo -e "${GREEN}Ready ✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 30 ]; then
        echo -e "${RED}Timeout ❌${NC}"
        warn "Frontend took too long, checking logs..."
        docker logs store-frontend --tail 20
    fi
done

# ------------------------------------------
# Step 8: Final Status
# ------------------------------------------
echo ""
echo "========================================="
echo "  📊 CONTAINER STATUS"
echo "========================================="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep store
echo ""

# Count running containers
RUNNING=$(docker ps --filter "name=store" --format "{{.Names}}" | wc -l)

if [ "$RUNNING" -eq 3 ]; then
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}  🎉 ALL 3 SERVICES RUNNING!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "  🌐 Website:  http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
    echo "  🔧 Backend:  http://localhost:3001"
    echo "  🗄️  Database: localhost:3307"
    echo ""
else
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}  ⚠️  Only $RUNNING/3 services running${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo "Check logs with:"
    echo "  docker logs store-backend"
    echo "  docker logs store-frontend"
    echo "  docker logs store-db"
fi

log "Deployment completed - $RUNNING/3 services running"