package com.company.inventory.qc.entity;

import com.company.inventory.entity.User;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Records every significant event in a batch's lifecycle.
 * Used to render the batch timeline UI.
 *
 * event_type values:
 *   STOCK_IN, QC_INSPECTED, QC_ACCEPTED, QC_REJECTED, QC_PARTIAL,
 *   DC_RAISED, DC_SENT, REPLACEMENT_RECEIVED, REPLACEMENT_QC_PASS,
 *   REPLACEMENT_QC_FAIL, CLOSED
 */
@Entity
@Table(name = "batch_timeline_event")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BatchTimelineEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false)
    private Long batchId;

    /** Event type key */
    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    /** Short title shown in timeline */
    @Column(name = "title", nullable = false, length = 255)
    private String title;

    /** Detail text (qty, remarks etc.) */
    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    /** ID of related entity (inspection_id, dc_id etc.) */
    @Column(name = "ref_id")
    private Long refId;

    /** Type of related entity */
    @Column(name = "ref_type", length = 50)
    private String refType;

    @Column(name = "happened_at", nullable = false)
    private LocalDateTime happenedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    @JsonIgnore
    private User createdBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}