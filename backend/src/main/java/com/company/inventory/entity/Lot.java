package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.company.inventory.qc.entity.StockInBatch;
@Entity
@Table(name = "lots")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Lot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "lot_id")
    private Long lotId;

    @Column(name = "lot_number", unique = true, nullable = false, length = 50)
    private String lotNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "updatedBy"})
    private Product product;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy"})
    private Supplier supplier;

    @Column(name = "purchase_quantity", nullable = false, precision = 10, scale = 2)
    private BigDecimal purchaseQuantity;

    @Column(name = "initial_quantity", nullable = false, precision = 10, scale = 2)
    private BigDecimal initialQuantity;

    @Column(name = "remaining_quantity", nullable = false, precision = 10, scale = 2)
    private BigDecimal remainingQuantity;

    @Column(name = "purchase_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "purchase_date", nullable = false)
    private LocalDate purchaseDate;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "rack_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy"})
    private Rack rack;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "box_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy"})
    private Box box;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LotStatus status = LotStatus.Active;

    @Column(name = "reference_number", length = 100)
    private String referenceNumber;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // ── HSN / GST ─────────────────────────────────────────────────
    @Column(name = "hsn_code", length = 20)
    private String hsnCode;

    @Column(name = "gst_percent", precision = 5, scale = 2)
    private BigDecimal gstPercent;

    @Column(name = "gst_amount", precision = 10, scale = 2)
    private BigDecimal gstAmount;
    // ─────────────────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    
    
    
    // ═══ QC Module (added 2026-05-12 by V20260512__qc_module.sql) ═══
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_in_batch_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private StockInBatch stockInBatch;
    
    
    
    

    @Column(name = "qc_decision", length = 20)
    private String qcDecision;          // ACCEPTED / REJECTED / HOLD / PARTIAL

    @Column(name = "qc_qty_accepted", precision = 10, scale = 2)
    private BigDecimal qcQtyAccepted;

    @Column(name = "qc_qty_rejected", precision = 10, scale = 2)
    private BigDecimal qcQtyRejected;

    @Column(name = "qc_qty_held", precision = 10, scale = 2)
    private BigDecimal qcQtyHeld;

    @Column(name = "qc_remarks", length = 500)
    private String qcRemarks;
    // ═══════════════════════════════════════════════════════════════


    public Long getStockInBatchId() {
        return stockInBatch != null ? stockInBatch.getId() : null;
    }


    
    
    
    // ── Match LotService usage: Active, Depleted, Cancelled ───────
    public enum LotStatus {
        Active, Depleted, Cancelled
    }

    // Helpers
    public boolean isActive() {
        return status == LotStatus.Active && remainingQuantity.compareTo(BigDecimal.ZERO) > 0;
    }

    public BigDecimal getTotalValue() {
        if (remainingQuantity == null || purchasePrice == null) return BigDecimal.ZERO;
        return remainingQuantity.multiply(purchasePrice);
    }

    public BigDecimal getTotalValueWithGst() {
        BigDecimal base = getTotalValue();
        if (gstAmount != null) return base.add(gstAmount);
        return base;
    }
}