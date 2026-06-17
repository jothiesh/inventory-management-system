package com.company.inventory.qc.entity;

import com.company.inventory.entity.Lot;
import com.company.inventory.entity.Product;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * One row per lot inspected. qty_accepted + qty_rejected + qty_held == qty_received.
 */
@Entity
@Table(name = "qc_item_decision")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QcItemDecision {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", nullable = false)
    @JsonIgnore
    private QcInspection inspection;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lot_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "product", "supplier", "rack", "box"})
    private Lot lot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "updatedBy"})
    private Product product;

    @Column(name = "qty_received", nullable = false, precision = 10, scale = 2)
    private BigDecimal qtyReceived;

    @Column(name = "qty_accepted", nullable = false, precision = 10, scale = 2)
    private BigDecimal qtyAccepted = BigDecimal.ZERO;

    @Column(name = "qty_rejected", nullable = false, precision = 10, scale = 2)
    private BigDecimal qtyRejected = BigDecimal.ZERO;

    @Column(name = "qty_held", nullable = false, precision = 10, scale = 2)
    private BigDecimal qtyHeld = BigDecimal.ZERO;

    /** ACCEPTED / REJECTED / HOLD / PARTIAL */
    @Column(name = "decision", nullable = false, length = 20)
    private String decision;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;
}
