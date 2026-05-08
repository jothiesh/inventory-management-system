package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "purchase_order_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "po_id", nullable = false)
    @JsonIgnore  // ← breaks the circular reference PurchaseOrder → items → purchaseOrder → items...
    private PurchaseOrder purchaseOrder;

    @Column(name = "sl_no")
    private Integer slNo;

    @Column(name = "hsn_code")
    private String hsnCode;

    @Column(name = "description", nullable = false)
    private String description;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "uom")
    private String uom;

    @Column(name = "rate", precision = 10, scale = 2)
    private BigDecimal rate;

    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount;
}