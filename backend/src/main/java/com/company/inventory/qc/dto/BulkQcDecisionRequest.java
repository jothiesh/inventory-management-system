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

    /** Filled checklists per category (optional but recommended). */
    private List<FilledChecklistRequest> checklists;
}