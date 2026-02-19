# Database Scripts

Complete SQL scripts for Inventory Management System database setup.

## Structure
```
database/
├── schema/          # Table creation scripts (run in order)
├── data/            # Default data insertion scripts
├── views/           # Database views
└── README.md        # This file
```

## Setup Instructions

### Option 1: Manual Setup (PostgreSQL)
```bash
# 1. Create database
psql -U postgres -f schema/01_create_database.sql

# 2. Create tables (in order)
psql -U postgres -d inventory_db -f schema/02_create_users_table.sql
psql -U postgres -d inventory_db -f schema/03_create_categories_table.sql
psql -U postgres -d inventory_db -f schema/04_create_racks_boxes_tables.sql
psql -U postgres -d inventory_db -f schema/05_create_products_table.sql
psql -U postgres -d inventory_db -f schema/06_create_suppliers_table.sql
psql -U postgres -d inventory_db -f schema/07_create_lots_table.sql
psql -U postgres -d inventory_db -f schema/08_create_stock_movements_table.sql
psql -U postgres -d inventory_db -f schema/09_create_current_stock_table.sql
psql -U postgres -d inventory_db -f schema/10_create_alerts_table.sql
psql -U postgres -d inventory_db -f schema/11_create_audit_logs_table.sql

# 3. Insert default data
psql -U postgres -d inventory_db -f data/insert_default_users.sql
psql -U postgres -d inventory_db -f data/insert_default_categories.sql
psql -U postgres -d inventory_db -f data/insert_default_racks.sql
psql -U postgres -d inventory_db -f data/insert_default_boxes.sql

# 4. Create views
psql -U postgres -d inventory_db -f views/stock_summary_view.sql
```

### Option 2: All-in-One Script
```bash
#!/bin/bash
# setup_database.sh

DB_NAME="inventory_db"
DB_USER="postgres"

# Create database and run all scripts
for script in schema/*.sql; do
    echo "Running $script..."
    psql -U $DB_USER -d $DB_NAME -f $script
done

for script in data/*.sql; do
    echo "Running $script..."
    psql -U $DB_USER -d $DB_NAME -f $script
done

for script in views/*.sql; do
    echo "Running $script..."
    psql -U $DB_USER -d $DB_NAME -f $script
done

echo "Database setup complete!"
```

### Option 3: Spring Boot Auto-Creation

Set in `application.properties`:
```properties
spring.jpa.hibernate.ddl-auto=update
```

Then use API endpoint to insert default data:
```
POST /api/init/all
```

## Database Schema

See `docs/DATABASE_SCHEMA.md` for detailed schema documentation.

## Backup & Restore

### Backup
```bash
pg_dump -U postgres inventory_db > backup_$(date +%Y%m%d).sql
```

### Restore
```bash
psql -U postgres -d inventory_db < backup_20250125.sql
```

## Default Credentials

- **Owner:** username=`owner`, password=`owner123`
- **Manager:** username=`manager`, password=`manager123`

**⚠️ IMPORTANT:** Change these passwords in production!