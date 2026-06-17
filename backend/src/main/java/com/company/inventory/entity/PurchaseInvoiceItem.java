package com.company.inventory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Line items extracted from the supplier invoice.
 * Useful for OCR-based pre-fill of Stock IN cart.
 */
@Entity
@Table(name = "purchase_invoice_item")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseInvoiceItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id", nullable = false)
    @JsonIgnore
    private PurchaseInvoice invoice;

    @Column(name = "sl_no", nullable = false)
    private Integer slNo;

    @Column(name = "part_no", length = 100)
    private String partNo;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "hsn_sac", length = 20)
    private String hsnSac;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", precision = 15, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "line_total", precision = 15, scale = 2)
    private BigDecimal lineTotal;

    @Column(name = "matched_product_id")
    private Long matchedProductId;
}
