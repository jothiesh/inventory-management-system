-- Products Table
CREATE TABLE products (
    product_id          BIGSERIAL PRIMARY KEY,
    category_id         BIGINT REFERENCES categories(category_id) NOT NULL,
    product_name        VARCHAR(200) NOT NULL,
    model_number        VARCHAR(100),
    part_number         VARCHAR(100),
    description         TEXT,
    product_type        VARCHAR(20) CHECK (product_type IN ('PCBA', 'Component', 'Module', 'Finished')) NOT NULL,
    unit                VARCHAR(20) CHECK (unit IN ('pcs', 'set', 'box', 'kg', 'meter')) DEFAULT 'pcs',
    default_rack_id     BIGINT REFERENCES racks(rack_id),
    default_box_id      BIGINT REFERENCES boxes(box_id),
    reorder_level       DECIMAL(10,2) DEFAULT 0,
    max_stock_level     DECIMAL(10,2),
    is_active           BOOLEAN DEFAULT TRUE,
    created_by          BIGINT REFERENCES users(user_id),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Specifications Table
CREATE TABLE product_specifications (
    spec_id         BIGSERIAL PRIMARY KEY,
    product_id      BIGINT REFERENCES products(product_id) ON DELETE CASCADE,
    spec_key        VARCHAR(50) NOT NULL,
    spec_value      VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_name ON products(product_name);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_product_specs_product ON product_specifications(product_id);

-- Comments
COMMENT ON TABLE products IS 'Products master table';
COMMENT ON TABLE product_specifications IS 'Custom specifications for products (e.g., MCU, Version)';