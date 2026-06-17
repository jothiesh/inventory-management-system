package com.company.inventory.qc.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QcAlertDto {

    private Long alertId;
    private String alertType;
    private String severity;
    private String title;
    private String message;
    private Long batchId;
    private Long inspectionId;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
}
