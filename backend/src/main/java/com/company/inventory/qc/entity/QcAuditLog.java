package com.company.inventory.qc.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Lightweight audit row for any QC action.
 * Separate from the system-wide audit_logs to avoid noise.
 */
@Entity
@Table(name = "qc_audit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class QcAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** BATCH_CREATED / BULK_ACCEPTED / BULK_REJECTED / PER_ITEM_PARTIAL / PDF_GENERATED ... */
    @Column(name = "action", nullable = false, length = 50)
    private String action;

    @Column(name = "inspection_id")
    private Long inspectionId;

    @Column(name = "batch_id")
    private Long batchId;

    @Column(name = "actor_user_id")
    private Long actorUserId;

    @Column(name = "actor_username", length = 100)
    private String actorUsername;

    @Column(name = "actor_ip", length = 64)
    private String actorIp;

    @Column(name = "notes", length = 1000)
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
