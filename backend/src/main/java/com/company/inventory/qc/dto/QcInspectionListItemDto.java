package com.company.inventory.qc.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QcInspectionListItemDto {

    private Long inspectionId;
    private Long batchId;
    private String batchRef;
    private String categoryCode;
    private String supplierName;
    private String invoiceNumber;
    private String remarks;
    // Decision data
    private String overallDecision;   // ACCEPTED | REJECTED | PARTIAL | HOLD
//    private String remarks;
    private String inspectorName;

    // Quantity summary
    private Integer itemCount;
    private BigDecimal totalReceived;
    private BigDecimal totalAccepted;
    private BigDecimal totalRejected;
    private BigDecimal totalHeld;

    // Timestamps
    private LocalDateTime stockInDate;
    private LocalDateTime inspectionDate;
    private LocalDateTime createdAt;

    // Whether PDF is available
    private Boolean hasPdf;
}
