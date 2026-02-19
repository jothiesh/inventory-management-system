-- Create Database
CREATE DATABASE IF NOT EXISTS inventory_db
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

-- Use the database
USE inventory_db;

-- Create schema comment
COMMENT ON DATABASE inventory_db IS 'Electronic Hardware Store & Production Inventory System';