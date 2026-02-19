-- Users Table
CREATE TABLE users (
    user_id         BIGSERIAL PRIMARY KEY,
    username        VARCHAR(50) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    role            VARCHAR(20) CHECK (role IN ('STORE_MANAGER', 'OWNER')) NOT NULL,
    email           VARCHAR(100),
    phone           VARCHAR(20),
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- Comments
COMMENT ON TABLE users IS 'System users - Store Manager and Owner';
COMMENT ON COLUMN users.role IS 'User role: STORE_MANAGER or OWNER';