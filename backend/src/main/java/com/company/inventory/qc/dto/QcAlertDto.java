package com.company.inventory.qc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * ★ REVERTED — the recurrence fields (occurrenceCount / lastOccurredAt /
 *   nextDueAt) are gone. Alerts fire once and never repeat, so there is
 *   nothing to count and no next occurrence to report.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QcAlertDto {

    private Long          alertId;
    private String        alertType;
    private String        severity;
    private String        title;
    private String        message;
    private Long          batchId;
    private Long          inspectionId;
    private Boolean       isRead;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}