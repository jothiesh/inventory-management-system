package com.company.inventory.qc.dto;

import com.company.inventory.qc.enums.QcDecision;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Approve / reject the entire batch in one shot.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BulkQcDecisionRequest {

    private Long batchId;

    /** Template code selected by inspector (IC/PCB/MECHANICAL etc.) */
    private String templateCode;

    /** ACCEPTED / REJECTED / HOLD */
    private QcDecision decision;

    private String overallRemarks;

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
     * goes nowhere. The "optional but recommended" comment was aspirational —
     * it was never wired up.
     *
     * Migrate those callers to checklistResults above, then delete this.
     */
    @Deprecated
    private List<FilledChecklistRequest> checklists;
}