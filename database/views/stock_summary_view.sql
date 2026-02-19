-- Stock Summary View
CREATE OR REPLACE VIEW stock_summary_view AS
SELECT 
    p.product_id,
    p.product_name,
    c.category_name,
    p.product_type,
    p.unit,
    p.reorder_level,
    p.max_stock_level,
    COALESCE(SUM(l.remaining_quantity), 0) AS total_stock,
    COUNT(l.lot_id) AS total_lots,
    MIN(l.purchase_date) AS oldest_purchase_date,
    MAX(l.purchase_date) AS latest_purchase_date,
    COALESCE(SUM(l.remaining_quantity * l.purchase_price), 0) AS total_value
FROM 
    products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN lots l ON p.product_id = l.product_id AND l.status = 'Active'
WHERE 
    p.is_active = TRUE
GROUP BY 
    p.product_id, p.product_name, c.category_name, p.product_type, p.unit, p.reorder_level, p.max_stock_level;

-- Comments
COMMENT ON VIEW stock_summary_view IS 'Aggregated stock summary by product';