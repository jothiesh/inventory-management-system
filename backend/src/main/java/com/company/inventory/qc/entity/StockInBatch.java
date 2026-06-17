package com.company.inventory.qc.entity;
import com.company.inventory.entity.Supplier;
import com.company.inventory.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
@Entity
@Table(name = "stock_in_batch")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class StockInBatch {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "batch_ref", unique = true, nullable = false, length = 50)
    private String batchRef;
    @Column(name = "invoice_no", length = 100)
    private String invoiceNo;
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy"})
    private Supplier supplier;
    @Column(name = "supplier_name", length = 255)
    private String supplierName;
    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;
    @Column(name = "total_qty", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalQty = BigDecimal.ZERO;
    @Column(name = "item_count", nullable = false)
    private Integer itemCount = 0;
    @Column(name = "qc_status", nullable = false, length = 20)
    private String qcStatus = "PENDING_QC";
    @Column(name = "qc_completed_at")
    private LocalDateTime qcCompletedAt;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "qc_completed_by")
    @JsonIgnore
    private User qcCompletedBy;
    @Column(name = "notes", length = 1000)
    private String notes;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ★ Replacement tracking fields
    /** Parent batch if this is a replacement batch */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_batch_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "qcCompletedBy"})
    private StockInBatch parentBatch;

    /** 0 = original, 1 = first replacement, 2 = second replacement etc. */
    @Column(name = "replacement_round", nullable = false)
    private Integer replacementRound = 0;

    /** DC that caused this replacement to be created */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dc_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
    private DeliveryReturnChallan dc;
}