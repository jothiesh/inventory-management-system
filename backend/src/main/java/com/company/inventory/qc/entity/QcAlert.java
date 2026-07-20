package com.company.inventory.qc.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * A QC alert. Fire-once.
 *
 * ★ REVERTED from the backoff model (occurrenceCount / lastOccurredAt /
 *   nextDueAt). Those columns are dropped by V3 — see sql/V3.
 *
 * The rule is now the simplest one that can work:
 *
 *   · an event happens  -> ONE alert row
 *   · it never re-raises, never escalates, never nags
 *   · the condition clears (batch leaves PENDING_QC) -> the row is deleted
 *   · anything left over is purged on a retention schedule
 *
 * Identity of "the same event" is (batch_id, alert_type) for batch-scoped
 * alerts and (inspection_id, alert_type) for inspection-scoped ones. A second
 * alert matching that identity is skipped — which is what makes it fire-once
 * even though QcOverdueScheduler runs every hour.
 */
@Entity
@Table(
    name = "qc_alert",
    indexes = {
        @Index(name = "ix_qa_batch_type",      columnList = "batch_id,alert_type"),
        @Index(name = "ix_qa_inspection_type", columnList = "inspection_id,alert_type"),
        @Index(name = "ix_qa_created",         columnList = "created_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QcAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alert_id")
    private Long alertId;

    @Column(name = "alert_type", nullable = false, length = 40)
    private String alertType;
    // NEW_BATCH, REJECTED, HOLD_REMINDER, OVERDUE, STOCK_OUT_*

    @Column(name = "severity", nullable = false, length = 10)
    @Builder.Default
    private String severity = "MEDIUM";
    // HIGH, MEDIUM, LOW

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "message", nullable = false, length = 1000)
    private String message;

    @Column(name = "batch_id")
    private Long batchId;

    @Column(name = "inspection_id")
    private Long inspectionId;

    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (isRead == null)    isRead = false;
        if (severity == null)  severity = "MEDIUM";
    }
}