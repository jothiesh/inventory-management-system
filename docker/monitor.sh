#!/bin/bash

# =============================================
#  STORE MONITOR - Auto Recovery
#  Runs every 5 minutes via cron
#  Restarts crashed containers automatically
# =============================================

STORE_DIR="/home/ec2-user/store/inventory-management-system"
LOG_FILE="/home/ec2-user/store/monitor.log"

log() { echo "[$(date)] $1" >> "$LOG_FILE"; }

# Check if all 3 containers are running
DB_OK=$(docker ps --filter "name=store-db" --filter "status=running" -q)
BACKEND_OK=$(docker ps --filter "name=store-backend" --filter "status=running" -q)
FRONTEND_OK=$(docker ps --filter "name=store-frontend" --filter "status=running" -q)

RESTART_NEEDED=false

if [ -z "$DB_OK" ]; then
    log "❌ store-db is DOWN"
    RESTART_NEEDED=true
fi

if [ -z "$BACKEND_OK" ]; then
    log "❌ store-backend is DOWN"
    RESTART_NEEDED=true
fi

if [ -z "$FRONTEND_OK" ]; then
    log "❌ store-frontend is DOWN"
    RESTART_NEEDED=true
fi

# Also check if backend is actually responding
if [ -n "$BACKEND_OK" ]; then
    if ! curl -sf http://localhost:3001/actuator/health > /dev/null 2>&1; then
        log "❌ store-backend is running but NOT responding"
        RESTART_NEEDED=true
    fi
fi

# Restart if needed
if [ "$RESTART_NEEDED" = true ]; then
    log "🔄 Restarting store services..."
    cd "$STORE_DIR"
    docker compose restart 2>/dev/null || docker-compose restart 2>/dev/null
    sleep 30
    
    # Verify restart worked
    RUNNING=$(docker ps --filter "name=store" --filter "status=running" -q | wc -l)
    if [ "$RUNNING" -eq 3 ]; then
        log "✅ Recovery successful - all 3 services running"
    else
        log "⚠️ Recovery partial - only $RUNNING/3 running, trying full restart..."
        docker compose down 2>/dev/null || docker-compose down 2>/dev/null
        sleep 5
        docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null
        sleep 60
        RUNNING=$(docker ps --filter "name=store" --filter "status=running" -q | wc -l)
        log "Full restart result: $RUNNING/3 services running"
    fi
else
    log "✅ All services healthy"
fi

# Keep log file from growing too large (keep last 500 lines)
if [ -f "$LOG_FILE" ]; then
    tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi