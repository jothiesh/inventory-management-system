package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "purchase_orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder                          // ← THIS was missing — adds .builder() method
public class PurchaseOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "po_code", unique = true, nullable = false)
    private String poCode;

    @Column(name = "po_date", nullable = false)
    private LocalDate poDate;

    @Column(name = "total_amount", precision = 12, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "total_in_words")
    private String totalInWords;

    @Column(name = "delivery_from")
    private LocalDate deliveryFrom;

    @Column(name = "delivery_to")
    private LocalDate deliveryTo;

    @Column(name = "payment_terms")
    private String paymentTerms;

    @Column(name = "notes")
    private String notes;

    @OneToMany(mappedBy = "purchaseOrder", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<PurchaseOrderItem> items;

    @ManyToOne
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }
}