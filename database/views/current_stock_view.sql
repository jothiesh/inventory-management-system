-- Create materialized view for better performance
CREATE MATERIALIZED VIEW current_stock AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY l.lot_id) as stock_id,
    l.product_id,
    l.lot_id,
    l.rack_id,
    l.box_id,
    l.remaining_quantity as available_quantity,
    l.purchase_price,
    l.purchase_date,
    (
        SELECT MAX(sm.created_at) 
        FROM stock_movements sm 
        WHERE sm.lot_id = l.lot_id
    ) as last_movement_date,
    l.updated_at
FROM 
    lots l
WHERE 
    l.status = 'Active' 
    AND l.remaining_quantity > 0;

-- Create indexes on materialized view
CREATE INDEX idx_mv_current_stock_product ON current_stock(product_id);
CREATE INDEX idx_mv_current_stock_lot ON current_stock(lot_id);
CREATE INDEX idx_mv_current_stock_rack ON current_stock(rack_id);

-- Refresh function (call after stock changes)
CREATE OR REPLACE FUNCTION refresh_current_stock()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh trigger (optional)
CREATE OR REPLACE FUNCTION trigger_refresh_current_stock()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_current_stock();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_current_stock_trigger
AFTER INSERT OR UPDATE OR DELETE ON lots
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_current_stock();