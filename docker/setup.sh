#!/bin/bash

# =============================================
#  STORE WEBSITE - ONE TIME SETUP
#  Run this ONCE on your EC2 server
#  Usage: ./setup.sh
# =============================================

echo ""
echo "========================================="
echo "   🏪 STORE WEBSITE - FIRST TIME SETUP"
echo "========================================="
echo ""

STORE_DIR="/home/ec2-user/store/inventory-management-system"

# ------------------------------------------
# Step 1: Install Docker (if not installed)
# ------------------------------------------
echo "Step 1: Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "  Installing Docker..."
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
    echo "  ✅ Docker installed"
else
    echo "  ✅ Docker already installed"
fi

# Start Docker if not running
sudo systemctl start docker

# ------------------------------------------
# Step 2: Install Docker Compose (if not installed)
# ------------------------------------------
echo "Step 2: Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo "  Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo "  ✅ Docker Compose installed"
else
    echo "  ✅ Docker Compose already installed"
fi

# ------------------------------------------
# Step 3: Install Git (if not installed)
# ------------------------------------------
echo "Step 3: Checking Git..."
if ! command -v git &> /dev/null; then
    sudo yum install -y git
    echo "  ✅ Git installed"
else
    echo "  ✅ Git already installed"
fi

# ------------------------------------------
# Step 4: Make scripts executable
# ------------------------------------------
echo "Step 4: Setting up scripts..."
cd "$STORE_DIR"
chmod +x deploy.sh monitor.sh 2>/dev/null || true
echo "  ✅ Scripts are executable"

# ------------------------------------------
# Step 5: Setup Auto-Recovery Cron Job
# ------------------------------------------
echo "Step 5: Setting up auto-recovery (every 5 minutes)..."

# Remove old cron entries for store monitor
crontab -l 2>/dev/null | grep -v "store.*monitor" > /tmp/crontab_temp || true

# Add new cron job - runs every 5 minutes
echo "*/5 * * * * /bin/bash $STORE_DIR/monitor.sh" >> /tmp/crontab_temp

# Add auto-start on reboot
echo "@reboot cd $STORE_DIR && docker compose up -d 2>/dev/null || docker-compose up -d" >> /tmp/crontab_temp

# Install crontab
crontab /tmp/crontab_temp
rm /tmp/crontab_temp

echo "  ✅ Auto-recovery: every 5 minutes"
echo "  ✅ Auto-start: on server reboot"

# ------------------------------------------
# Step 6: Open Firewall Ports
# ------------------------------------------
echo "Step 6: Checking ports..."
echo "  ⚠️  Make sure these ports are open in AWS Security Group:"
echo "     - Port 80  (HTTP - Website)"
echo "     - Port 443 (HTTPS - optional)"
echo "     - Port 3301 (Backend API)"
echo "     - Port 3307 (Database - only if needed externally)"

# ------------------------------------------
# Done!
# ------------------------------------------
echo ""
echo "========================================="
echo "  ✅ SETUP COMPLETE!"
echo "========================================="
echo ""
echo "  Now run:"
echo "    cd $STORE_DIR"
echo "    ./deploy.sh --fresh"
echo ""
echo "  Useful commands:"
echo "    ./deploy.sh          - Deploy/restart"
echo "    ./deploy.sh --fresh  - Clean build"
echo "    docker logs store-backend   - Backend logs"
echo "    docker logs store-frontend  - Frontend logs"
echo "    docker logs store-db        - Database logs"
echo ""