package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * CurrentStock Entity
 * 
 * Represents the current stock snapshot for real-time stock tracking.
 * This can be either a regular table or a materialized view that aggregates
 * data from the Lots table.
 * 
 * Purpose:
 * - Quick lookup of current stock levels
 * - Avoid complex aggregation queries on Lots table
 * - Track stock location and pricing
 * 
 * Alternative: Can be implemented as a database VIEW instead of table
 */
@Entity
@Table(name = "current_stock", indexes = {
    @Index(name = "idx_current_stock_product", columnList = "product_id"),
    @Index(name = "idx_current_stock_lot", columnList = "lot_id"),
    @Index(name = "idx_current_stock_rack", columnList = "rack_id"),
    @Index(name = "idx_current_stock_box", columnList = "box_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CurrentStock {

    /**
     * Primary Key
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stock_id")
    private Long stockId;

    /**
     * Product reference
     * Links to the product this stock belongs to
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /**
     * Lot reference
     * Links to the specific lot (purchase batch)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    private Lot lot;

    /**
     * Storage rack reference
     * Where this stock is physically located
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rack_id")
    private Rack rack;

    /**
     * Storage box reference
     * Specific box within the rack
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "box_id")
    private Box box;

    /**
     * Available quantity
     * Current stock quantity for this lot
     */
    @Column(name = "available_quantity", nullable = false, precision = 10, scale = 2)
    private BigDecimal availableQuantity;

    /**
     * Purchase price
     * Original purchase price for this lot (for FIFO costing)
     */
    @Column(name = "purchase_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal purchasePrice;

    /**
     * Purchase date
     * Date when this lot was purchased (for FIFO ordering)
     */
    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    /**
     * Last movement date
     * Timestamp of the last stock movement for this stock entry
     * Used for dead stock detection
     */
    @Column(name = "last_movement_date")
    private LocalDateTime lastMovementDate;

    /**
     * Last updated timestamp
     * When this stock record was last updated
     */
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * PrePersist callback
     * Sets timestamps before inserting
     */
    @PrePersist
    protected void onCreate() {
        updatedAt = LocalDateTime.now();
        if (lastMovementDate == null) {
            lastMovementDate = LocalDateTime.now();
        }
    }

    /**
     * PreUpdate callback
     * Updates timestamp before updating
     */
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Calculate total value of this stock
     * @return Total value (quantity × price)
     */
    public BigDecimal getTotalValue() {
        if (availableQuantity == null || purchasePrice == null) {
            return BigDecimal.ZERO;
        }
        return availableQuantity.multiply(purchasePrice);
    }

    /**
     * Check if stock is available
     * @return true if quantity > 0
     */
    public boolean isAvailable() {
        return availableQuantity != null && availableQuantity.compareTo(BigDecimal.ZERO) > 0;
    }

    /**
     * Get stock location as string
     * @return Location string (e.g., "R1-B1")
     */
    public String getLocationString() {
        if (rack == null) return "Unassigned";
        
        String rackNumber = rack.getRackNumber();
        String boxNumber = box != null ? box.getBoxNumber() : "N/A";
        
        return rackNumber + "-" + boxNumber;
    }
}