package com.company.inventory.qc.dto;

import com.company.inventory.qc.enums.QcDecision;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Per-lot decision payload. qtyAccepted + qtyRejected + qtyHeld == qtyReceived.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerItemQcDecisionRequest {

    private Long batchId;

    /** Template code selected by inspector */
    private String templateCode;
    private String overallRemarks;
    private List<ItemDecision> items;
    private List<FilledChecklistRequest> checklists;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemDecision {
        private Long lotId;
        private BigDecimal qtyAccepted;
        private BigDecimal qtyRejected;
        private BigDecimal qtyHeld;
        private QcDecision decision;        // ACCEPTED / REJECTED / HOLD / PARTIAL
        private String rejectionReason;
    }
}