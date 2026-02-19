-- Racks Table
CREATE TABLE racks (
    rack_id         BIGSERIAL PRIMARY KEY,
    rack_number     VARCHAR(20) UNIQUE NOT NULL,
    rack_name       VARCHAR(100),
    location        VARCHAR(100),
    capacity        INTEGER,
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      BIGINT REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Boxes Table
CREATE TABLE boxes (
    box_id          BIGSERIAL PRIMARY KEY,
    rack_id         BIGINT REFERENCES racks(rack_id) ON DELETE CASCADE,
    box_number      VARCHAR(20) NOT NULL,
    box_label       VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      BIGINT REFERENCES users(user_id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(rack_id, box_number)
);

-- Indexes
CREATE INDEX idx_racks_active ON racks(is_active);
CREATE INDEX idx_boxes_rack ON boxes(rack_id);
CREATE INDEX idx_boxes_active ON boxes(is_active);

-- Comments
COMMENT ON TABLE racks IS 'Storage racks for inventory organization';
COMMENT ON TABLE boxes IS 'Storage boxes within racks';