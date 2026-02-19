-- Current Stock Table (Optional - can be a view)
CREATE TABLE current_stock (
    stock_id            BIGSERIAL PRIMARY KEY,
    product_id          BIGINT REFERENCES products(product_id) NOT NULL,
    lot_id              BIGINT REFERENCES lots(lot_id) NOT NULL,
    rack_id             BIGINT REFERENCES racks(rack_id),
    box_id              BIGINT REFERENCES boxes(box_id),
    available_quantity  DECIMAL(10,2) NOT NULL,
    purchase_price      DECIMAL(10,2) NOT NULL,
    purchase_date       DATE NOT NULL,
    last_movement_date  TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_current_stock_product ON current_stock(product_id);
CREATE INDEX idx_current_stock_lot ON current_stock(lot_id);

-- Comments
COMMENT ON TABLE current_stock IS 'Real-time stock snapshot (can be materialized view)';