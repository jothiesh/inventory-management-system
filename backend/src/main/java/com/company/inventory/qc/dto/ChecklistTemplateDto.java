package com.company.inventory.qc.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChecklistTemplateDto {

    private Long id;
    private String categoryCode;
    private String categoryName;
    private String formNo;
    private List<StageDto> stages;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StageDto {
        private Long id;
        private Integer slNo;
        private String stageOperation;
        private String checkPoint;
        private Integer aqlMin;
        private Integer aqlMax;
        private String aqlLabel;
    }
}
