-- Alerts Table
CREATE TABLE alerts (
    alert_id            BIGSERIAL PRIMARY KEY,
    alert_type          VARCHAR(30) CHECK (alert_type IN ('DEAD_STOCK', 'SLOW_MOVING', 'PRICE_CHANGE', 'LOW_STOCK', 'EXCESS_STOCK')) NOT NULL,
    product_id          BIGINT REFERENCES products(product_id),
    severity            VARCHAR(10) CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')) DEFAULT 'MEDIUM',
    message             TEXT NOT NULL,
    is_read             BOOLEAN DEFAULT FALSE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at     TIMESTAMP,
    acknowledged_by     BIGINT REFERENCES users(user_id)
);

-- Indexes
CREATE INDEX idx_alerts_type ON alerts(alert_type);
CREATE INDEX idx_alerts_unread ON alerts(is_read);
CREATE INDEX idx_alerts_product ON alerts(product_id);
CREATE INDEX idx_alerts_date ON alerts(created_at);

-- Comments
COMMENT ON TABLE alerts IS 'System-generated alerts for owners';
COMMENT ON COLUMN alerts.alert_type IS 'Type of alert: DEAD_STOCK, SLOW_MOVING, PRICE_CHANGE, LOW_STOCK, EXCESS_STOCK';