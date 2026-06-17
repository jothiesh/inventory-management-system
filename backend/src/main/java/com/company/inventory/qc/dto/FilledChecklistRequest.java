package com.company.inventory.qc.dto;

import com.company.inventory.qc.enums.StageResult;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * A filled checklist submitted with the decision payload.
 * One per category present in the batch.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FilledChecklistRequest {

    private String categoryCode;            // STICKER / IC / PCB / ENCLOSURE
    private List<StageResultRequest> stageResults;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StageResultRequest {
        private Long stageId;
        private StageResult result;         // PASS / FAIL / NA
        private String remarks;
    }
}
