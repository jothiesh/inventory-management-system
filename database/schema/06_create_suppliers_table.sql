-- Suppliers Table
CREATE TABLE suppliers (
    supplier_id     BIGSERIAL PRIMARY KEY,
    supplier_name   VARCHAR(200) NOT NULL,
    supplier_code   VARCHAR(50) UNIQUE,
    contact_person  VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(100),
    address         TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      BIGINT REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_suppliers_active ON suppliers(is_active);
CREATE INDEX idx_suppliers_name ON suppliers(supplier_name);

-- Comments
COMMENT ON TABLE suppliers IS 'Supplier information';