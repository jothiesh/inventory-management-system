package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "current_stock", indexes = {
    @Index(name = "idx_current_stock_product", columnList = "product_id"),
    @Index(name = "idx_current_stock_lot",     columnList = "lot_id"),
    @Index(name = "idx_current_stock_rack",    columnList = "rack_id"),
    @Index(name = "idx_current_stock_box",     columnList = "box_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CurrentStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "stock_id")
    private Long stockId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)   // ← fixes delete product error
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "updatedBy"})
    private Product product;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "lot_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "product", "supplier", "rack", "box"})
    private Lot lot;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rack_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy"})
    private Rack rack;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "box_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy"})
    private Box box;

    @Column(name = "available_quantity", nullable = false, precision = 10, scale = 2)
    private BigDecimal availableQuantity;

    @Column(name = "purchase_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    @Column(name = "last_movement_date")
    private LocalDateTime lastMovementDate;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        updatedAt = LocalDateTime.now();
        if (lastMovementDate == null) lastMovementDate = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public BigDecimal getTotalValue() {
        if (availableQuantity == null || purchasePrice == null) return BigDecimal.ZERO;
        return availableQuantity.multiply(purchasePrice);
    }

    public boolean isAvailable() {
        return availableQuantity != null && availableQuantity.compareTo(BigDecimal.ZERO) > 0;
    }

    public String getLocationString() {
        if (rack == null) return "Unassigned";
        return rack.getRackNumber() + "-" + (box != null ? box.getBoxNumber() : "N/A");
    }
}