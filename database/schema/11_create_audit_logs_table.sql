-- Audit Logs Table
CREATE TABLE audit_logs (
    log_id          BIGSERIAL PRIMARY KEY,
    user_id         BIGINT REFERENCES users(user_id),
    action          VARCHAR(100) NOT NULL,
    table_name      VARCHAR(50),
    record_id       BIGINT,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      VARCHAR(50),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);
CREATE INDEX idx_audit_table ON audit_logs(table_name);

-- Comments
COMMENT ON TABLE audit_logs IS 'Audit trail for all system actions';