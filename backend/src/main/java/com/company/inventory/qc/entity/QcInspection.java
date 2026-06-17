package com.company.inventory.qc.entity;

import com.company.inventory.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "qc_inspection")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QcInspection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_in_batch_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "createdBy", "qcCompletedBy"})
    private StockInBatch batch;

    @Column(name = "invoice_no", length = 100)
    private String invoiceNo;

    @Column(name = "supplier_name", length = 255)
    private String supplierName;

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Column(name = "lot_count", nullable = false)
    private Integer lotCount;

    /** ACCEPTED / REJECTED / HOLD / PARTIAL */
    @Column(name = "overall_decision", nullable = false, length = 20)
    private String overallDecision;

    @Column(name = "overall_remarks", length = 1000)
    private String overallRemarks;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspected_by", nullable = false)
    @JsonIgnore
    private User inspectedBy;

    @Column(name = "inspected_at", nullable = false)
    private LocalDateTime inspectedAt;

    @Column(name = "pdf_path", length = 500)
    private String pdfPath;

    @Column(name = "form_no", length = 50)
    private String formNo = "TTPL/QC/F/IH Rev:2 dated 10/07/24";

    /** ★ Template code selected by inspector (IC/PCB/MECHANICAL etc.) */
    @Column(name = "template_code", length = 50)
    private String templateCode;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}