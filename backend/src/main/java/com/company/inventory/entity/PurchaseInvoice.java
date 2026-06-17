package com.company.inventory.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Master record for a supplier purchase invoice.
 * Created when QC scans/uploads the supplier invoice on tablet,
 * OR auto-created from Stock IN entry — whichever happens first.
 *
 * One purchase_invoice typically maps to one stock_in_batch and
 * eventually one qc_inspection.
 */
@Entity
@Table(name = "purchase_invoice",
       uniqueConstraints = @UniqueConstraint(columnNames = {"invoice_no", "supplier_name"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PurchaseInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_no", nullable = false, length = 100)
    private String invoiceNo;

    @Column(name = "invoice_date", nullable = false)
    private LocalDate invoiceDate;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "supplier_name", nullable = false, length = 255)
    private String supplierName;

    @Column(name = "supplier_gstin", length = 50)
    private String supplierGstin;

    @Column(name = "po_no", length = 100)
    private String poNo;

    @Column(name = "invoice_total", precision = 15, scale = 2)
    private BigDecimal invoiceTotal;

    @Column(name = "currency_code", length = 10)
    @Builder.Default
    private String currencyCode = "INR";

    // --- Scanned invoice attachment ---
    @Column(name = "invoice_file_path", length = 500)
    private String invoiceFilePath;

    @Column(name = "invoice_file_name", length = 255)
    private String invoiceFileName;

    @Column(name = "invoice_mime_type", length = 100)
    private String invoiceMimeType;

    @Column(name = "invoice_file_size")
    private Long invoiceFileSize;

    // --- Linkage to Stock IN ---
    @Column(name = "stock_in_batch_id")
    private Long stockInBatchId;

    // --- Audit ---
    @Column(name = "uploaded_by", nullable = false)
    private Long uploadedBy;

    @Column(name = "uploaded_at")
    private LocalDateTime uploadedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JsonIgnore
    @Builder.Default
    private List<PurchaseInvoiceItem> items = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (uploadedAt == null) uploadedAt = LocalDateTime.now();
    }
}
