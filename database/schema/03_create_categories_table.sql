-- Categories Table
CREATE TABLE categories (
    category_id     BIGSERIAL PRIMARY KEY,
    category_name   VARCHAR(100) UNIQUE NOT NULL,
    category_code   VARCHAR(20) UNIQUE NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      BIGINT REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_name ON categories(category_name);

-- Comments
COMMENT ON TABLE categories IS 'Product categories (PCBA, Microcontrollers, etc.)';