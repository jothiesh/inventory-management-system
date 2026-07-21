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

    /** ★ The name the inspector typed on the form (e.g. "sowmyashree").
     *  Stored on the inspection so the reopened checklist shows the real
     *  name instead of the generic "QC Inspector" fallback. */
    private String inspectorName;

    private String overallRemarks;

    private List<ItemDecision> items;

    /**
     * ★ NEW — the filled checklist rows.
     *
     * One entry per (lot, checkpoint): the Inspected Qty (AQL), the remark and
     * the Pass/Fail/NA the inspector actually ticked. The frontend has always
     * sent this under the name "checklistResults"; until now no field carried
     * that name, so Jackson silently discarded the whole array and the QC
     * record was never stored.
     *
     * Read by QcInspectionService -> QcFilledChecklistService.attachToInspection().
     */
    private List<ChecklistResultDto> checklistResults;

    /**
     * ⚠ DEAD FIELD — kept only so existing callers don't break on an unknown
     * property. Nothing reads getChecklists(): QcInspectionService never calls
     * it. The QcQueue quick-decision modal posts "checklists" here and the data
     * goes nowhere.
     *
     * Migrate those callers to checklistResults above, then delete this.
     */
    @Deprecated
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