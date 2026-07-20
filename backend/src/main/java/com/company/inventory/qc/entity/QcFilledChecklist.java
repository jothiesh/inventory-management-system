package com.company.inventory.qc.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * The filled QC checklist — the actual quality record that the form number on
 * the PDF refers to.
 *
 * ★ CHANGED: `inspection` is now NULLABLE and `batchId` was added.
 *
 *   The inspector clicks Download BEFORE submitting the decision, so at save
 *   time no qc_inspection row exists yet. The checklist is therefore first
 *   written as a DRAFT keyed by batch_id (inspection_id = NULL). When the
 *   decision is submitted, QcFilledChecklistService claims that draft and
 *   sets inspection_id.
 *
 *   draft            → inspection_id IS NULL
 *   committed record → inspection_id IS NOT NULL
 */
@Entity
@Table(
    name = "qc_filled_checklist",
    indexes = {
        @Index(name = "ix_qfc_batch",      columnList = "batch_id"),
        @Index(name = "ix_qfc_inspection", columnList = "inspection_id")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QcFilledChecklist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Null while this is still a Download-time draft. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id")
    @JsonIgnore
    private QcInspection inspection;

    /** ★ Always set — how a draft is found before the inspection exists. */
    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private QcChecklistTemplate template;

    @Column(name = "category_code", nullable = false, length = 50)
    private String categoryCode;

    @OneToMany(mappedBy = "filledChecklist", fetch = FetchType.LAZY,
               cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore
    private List<QcFilledStageResult> results = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Transient
    public boolean isDraft() {
        return inspection == null;
    }
}