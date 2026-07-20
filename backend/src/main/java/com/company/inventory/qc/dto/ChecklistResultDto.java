package com.company.inventory.qc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One filled checkpoint row — what the inspector actually entered on the
 * checklist for a single stage of a single lot.
 *
 * This is the payload the frontend has always been sending as
 * "checklistResults" and which the backend used to drop on the floor.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistResultDto {

    /** Lot this row belongs to. Null = applies to the whole batch. */
    private Long lotId;

    /** FK to qc_checklist_stage.id */
    private Long stageId;

    /** PASS / FAIL / NA */
    private String result;

    /** Free-text remark typed against this checkpoint */
    private String remarks;

    /**
     * "Inspected Qty (AQL)" as typed. Kept as a String on purpose — the form
     * allows values like "1 Out of 10" as well as plain numbers.
     */
    private String inspectedQty;
}
