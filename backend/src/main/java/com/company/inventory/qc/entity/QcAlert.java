package com.company.inventory.qc.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "qc_alert")
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
    // Values: NEW_BATCH, REJECTED, HOLD_REMINDER, OVERDUE

    @Column(name = "severity", nullable = false, length = 10)
    @Builder.Default
    private String severity = "MEDIUM";
    // Values: HIGH, MEDIUM, LOW

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
        if (isRead == null) isRead = false;
        if (severity == null) severity = "MEDIUM";
    }
}
