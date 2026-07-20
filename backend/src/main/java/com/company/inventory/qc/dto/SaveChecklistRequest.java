package com.company.inventory.qc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Body of POST /api/qc/checklists/draft — fired when the inspector clicks
 * Download on the QC Inspection screen, so the filled form is persisted at
 * that moment rather than needing a separate Save button.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaveChecklistRequest {

    private Long   batchId;
    private String templateCode;
    private List<ChecklistResultDto> results;
}
