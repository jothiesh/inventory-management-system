-- Stock Movements Table
CREATE TABLE stock_movements (
    movement_id         BIGSERIAL PRIMARY KEY,
    lot_id              BIGINT REFERENCES lots(lot_id) NOT NULL,
    product_id          BIGINT REFERENCES products(product_id) NOT NULL,
    movement_type       VARCHAR(10) CHECK (movement_type IN ('IN', 'OUT')) NOT NULL,
    transaction_type    VARCHAR(20) CHECK (transaction_type IN ('Purchase', 'Sale', 'Production', 'Damage', 'Scrap', 'Transfer')) NOT NULL,
    quantity            DECIMAL(10,2) NOT NULL,
    from_rack_id        BIGINT REFERENCES racks(rack_id),
    from_box_id         BIGINT REFERENCES boxes(box_id),
    to_rack_id          BIGINT REFERENCES racks(rack_id),
    to_box_id           BIGINT REFERENCES boxes(box_id),
    reference_number    VARCHAR(100),
    notes               TEXT,
    created_by          BIGINT REFERENCES users(user_id),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_movements_lot ON stock_movements(lot_id);
CREATE INDEX idx_movements_product ON stock_movements(product_id);
CREATE INDEX idx_movements_date ON stock_movements(created_at);
CREATE INDEX idx_movements_type ON stock_movements(movement_type);

-- Comments
COMMENT ON TABLE stock_movements IS 'All stock transactions (IN/OUT)';
COMMENT ON COLUMN stock_movements.movement_type IS 'IN for stock additions, OUT for stock issues';