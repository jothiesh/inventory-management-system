package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "purchase_request_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseRequestItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "pr_id", nullable = false)
    @JsonIgnore  // breaks circular reference
    private PurchaseRequest purchaseRequest;

    // Sl.No
    @Column(name = "sl_no")
    private Integer slNo;

    // Part No
    @Column(name = "part_no", length = 100)
    private String partNo;

    // Description
    @Column(name = "description", nullable = false, length = 500)
    private String description;

    // Qty — max 6 digits (999999)
    @Column(name = "quantity", nullable = false)
    private Integer quantity; // validated max 999999 in service

    // Remark
    @Column(name = "remark", length = 500)
    private String remark;

    // Rate (optional — for estimation)
    @Column(name = "rate", precision = 10, scale = 2)
    private BigDecimal rate;

    // Total = qty * rate
    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount;
}
