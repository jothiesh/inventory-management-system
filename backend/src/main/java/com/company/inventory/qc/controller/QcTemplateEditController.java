package com.company.inventory.qc.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.qc.dto.ChecklistTemplateDto;
import com.company.inventory.qc.service.QcTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Edit endpoint for QC checklist templates.
 * PUT /api/qc/templates/{categoryCode}/stages
 */
@RestController
@RequestMapping("/api/qc/templates")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Slf4j
public class QcTemplateEditController {

    private final QcTemplateService templateService;

    /**
     * PUT /api/qc/templates/{categoryCode}/stages
     * Update the stages of a checklist template.
     *
     * Request body:
     * {
     *   "stages": [
     *     { "stageOperation": "Visual Inspection", "checkPoint": "VI for Packing quality", "aqlLabel": "As per AQL" },
     *     ...
     *   ]
     * }
     */
    @PutMapping("/{categoryCode}/stages")
    @PreAuthorize("hasAnyAuthority('QC','OWNER','MANAGER')")
    @Operation(summary = "Update stages of a checklist template")
    public ResponseEntity<ApiResponse<ChecklistTemplateDto>> updateStages(
            @PathVariable String categoryCode,
            @RequestBody Map<String, Object> body) {

        String code = categoryCode == null ? "" : categoryCode.toUpperCase();
        log.info("PUT /api/qc/templates/{}/stages — Updating checklist stages.", code);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> stages = (List<Map<String, Object>>) body.get("stages");

        if (stages == null || stages.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("stages list is required and cannot be empty"));
        }

        ChecklistTemplateDto updated = templateService.updateStages(code, stages);
        log.info("Template {} updated with {} stages.", code, updated.getStages().size());
        return ResponseEntity.ok(ApiResponse.success("Template updated", updated));
    }
}
