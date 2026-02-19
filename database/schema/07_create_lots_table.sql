-- Lots (Batches) Table
CREATE TABLE lots (
    lot_id              BIGSERIAL PRIMARY KEY,
    lot_number          VARCHAR(50) UNIQUE NOT NULL,
    product_id          BIGINT REFERENCES products(product_id) NOT NULL,
    supplier_id         BIGINT REFERENCES suppliers(supplier_id),
    purchase_quantity   DECIMAL(10,2) NOT NULL,
    purchase_price      DECIMAL(10,2) NOT NULL,
    purchase_date       DATE NOT NULL,
    rack_id             BIGINT REFERENCES racks(rack_id),
    box_id              BIGINT REFERENCES boxes(box_id),
    remaining_quantity  DECIMAL(10,2) NOT NULL,
    status              VARCHAR(20) CHECK (status IN ('Active', 'Depleted', 'Expired')) DEFAULT 'Active',
    created_by          BIGINT REFERENCES users(user_id),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_lots_product ON lots(product_id);
CREATE INDEX idx_lots_status ON lots(status);
CREATE INDEX idx_lots_date ON lots(purchase_date);
CREATE INDEX idx_lots_number ON lots(lot_number);

-- Comments
COMMENT ON TABLE lots IS 'Purchase batches with FIFO tracking';
COMMENT ON COLUMN lots.lot_number IS 'Auto-generated unique lot number';
COMMENT ON COLUMN lots.remaining_quantity IS 'Current available quantity in this lot';