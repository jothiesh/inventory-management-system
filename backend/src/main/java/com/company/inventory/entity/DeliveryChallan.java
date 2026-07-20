package com.company.inventory.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Outgoing Delivery Challan (Job Work).
 * OUR components go OUT to a supplier for assembly; the finished
 * assembly comes back IN as a PENDING_QC StockInBatch.
 *
 * Status flow: DRAFT → SENT → ASSEMBLY_RECEIVED → CLOSED
 */
@Entity
@Table(name = "delivery_challans")
@Getter
@Setter
@NoArgsConstructor
public class DeliveryChallan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dc_number", unique = true, nullable = false, length = 40)
    private String dcNumber;

    // supplier is the DESTINATION only — never filters components
    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "supplier_address", length = 500)
    private String supplierAddress;

    @Column(name = "supplier_gstin", length = 30)
    private String supplierGstin;

    @Column(name = "dc_date")
    private LocalDate dcDate;

    @Column(nullable = false, length = 30)
    private String status = "DRAFT";

    @Column(length = 30)
    private String purpose = "JOB_WORK";

    @Column(length = 1000)
    private String remarks;

    /** transactionGroupId stamped on every JobWork OUT movement of this DC */
    @Column(name = "txn_group_id", length = 64)
    private String txnGroupId;

    @Column(name = "assembly_batch_id")
    private Long assemblyBatchId;

    @Column(name = "assembly_batch_ref", length = 40)
    private String assemblyBatchRef;

    @Column(name = "item_count")
    private Integer itemCount = 0;

    @Column(name = "total_qty", precision = 15, scale = 3)
    private BigDecimal totalQty = BigDecimal.ZERO;

    @Column(name = "sent_at")               private LocalDateTime sentAt;
    @Column(name = "assembly_received_at")  private LocalDateTime assemblyReceivedAt;
    @Column(name = "closed_at")             private LocalDateTime closedAt;

    @Column(name = "created_by")            private Long createdById;
    @Column(name = "created_by_name", length = 120) private String createdByName;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "challan", cascade = CascadeType.ALL,
               orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("id ASC")
    private List<DeliveryChallanItem> items = new ArrayList<>();

    @PrePersist
    void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
        if (status == null) status = "DRAFT";
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
