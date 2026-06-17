package com.company.inventory.qc.dto;

import com.company.inventory.qc.enums.QcDecision;
import com.company.inventory.qc.enums.QcStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QcDecisionResponse {

    private Long inspectionId;
    private Long batchId;
    private QcStatus batchStatus;
    private QcDecision overallDecision;
    private Integer lotCount;
    private BigDecimal totalAccepted;
    private BigDecimal totalRejected;
    private BigDecimal totalHeld;
    private String pdfDownloadUrl;          // /api/qc/inspections/{id}/pdf
}
