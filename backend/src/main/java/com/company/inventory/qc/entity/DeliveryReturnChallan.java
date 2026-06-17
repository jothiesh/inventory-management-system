package com.company.inventory.qc.entity;

import com.company.inventory.entity.Supplier;
import com.company.inventory.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Delivery Return Challan — raised when QC rejects items and they
 * need to go back to the supplier for replacement.
 *
 * Status flow:
 *   DRAFT → SENT → REPLACEMENT_RECEIVED → CLOSED
 */
@Entity
@Table(name = "delivery_return_challan")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class DeliveryReturnChallan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dc_number", unique = true, nullable = false, length = 50)
    private String dcNumber;

    /** The original batch that had QC rejections */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_batch_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "qcCompletedBy"})
    private StockInBatch originalBatch;

    /** Set once replacement batch arrives */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "replacement_batch_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "qcCompletedBy"})
    private StockInBatch replacementBatch;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "supplier_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy"})
    private Supplier supplier;

    @Column(name = "supplier_name", length = 255)
    private String supplierName;

    @Column(name = "dc_date", nullable = false)
    private LocalDate dcDate;

    /**
     * Reason: QC_REJECTION / DAMAGE / SHORT_SUPPLY / OTHER
     */
    @Column(name = "reason", nullable = false, length = 50)
    @Builder.Default
    private String reason = "QC_REJECTION";

    /**
     * Status: DRAFT / SENT / REPLACEMENT_RECEIVED / CLOSED
     */
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "DRAFT";

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "pdf_path", length = 500)
    private String pdfPath;

    @OneToMany(mappedBy = "challan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<DeliveryReturnChallanItem> items = new ArrayList<>();

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
}