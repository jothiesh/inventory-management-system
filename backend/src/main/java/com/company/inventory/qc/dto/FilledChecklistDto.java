package com.company.inventory.qc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * The saved checklist for one inspection (or one in-progress batch draft),
 * returned by:
 *    GET /api/qc/inspections/{id}/checklist
 *    GET /api/qc/checklists/draft/{batchId}
 *
 * The frontend uses templateCode to auto-select the right template, then
 * seeds every Qty / Remarks / Pass-Fail cell from results.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FilledChecklistDto {

    private Long   id;
    private Long   inspectionId;   // null while still a draft
    private Long   batchId;
    private String templateCode;
    private String categoryName;
    private String formNo;

    /** true = saved from Download, decision not submitted yet */
    private boolean draft;

    private List<ChecklistResultDto> results;
}
