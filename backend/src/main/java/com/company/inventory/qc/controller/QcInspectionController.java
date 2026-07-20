package com.company.inventory.qc.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.qc.dto.*;
import com.company.inventory.qc.entity.QcInspection;
import com.company.inventory.qc.exception.QcException;
import com.company.inventory.qc.repository.QcInspectionRepository;
import com.company.inventory.qc.service.QcInspectionService;
import com.company.inventory.qc.service.QcFilledChecklistService;
import com.company.inventory.qc.service.QcTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * QC REST API — 2 roles only: OWNER · QC
 *
 *  Read  (GET):  OWNER + QC
 *  Write (POST): QC only  (only inspector submits decisions)
 *  DC / Reports: OWNER only
 */
@RestController
@RequestMapping("/api/qc")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "QC Inspection")
@Slf4j
public class QcInspectionController {

    private final QcInspectionService    inspectionService;
    private final QcTemplateService      templateService;
    private final QcInspectionRepository inspectionRepo;
    private final QcFilledChecklistService filledChecklistService;

    // ── QUEUE ─────────────────────────────────────────────────
    @GetMapping("/queue")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Pending QC queue")
    public ResponseEntity<ApiResponse<List<QcQueueItemDto>>> queue() {
        return ResponseEntity.ok(ApiResponse.success(
                "Pending QC batches", inspectionService.getPendingQueue()));
    }

    // ── BATCH DETAIL ──────────────────────────────────────────
    @GetMapping("/batches/{batchId}")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Batch detail for inspection")
    public ResponseEntity<ApiResponse<QcBatchDetailDto>> getBatch(
            @PathVariable Long batchId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Batch detail", inspectionService.getBatchDetail(batchId)));
    }

    // ── TEMPLATES ─────────────────────────────────────────────
    @GetMapping("/templates")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "All active checklist templates")
    public ResponseEntity<ApiResponse<List<ChecklistTemplateDto>>> allTemplates() {
        return ResponseEntity.ok(ApiResponse.success(
                "Templates", templateService.getAllActiveTemplates()));
    }

    @GetMapping("/templates/{categoryCode}")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Checklist template by category")
    public ResponseEntity<ApiResponse<ChecklistTemplateDto>> templateByCode(
            @PathVariable String categoryCode) {
        String code = categoryCode == null ? "" : categoryCode.toUpperCase();
        return ResponseEntity.ok(ApiResponse.success(
                "Template", templateService.getByCategoryCode(code)));
    }

    // ── DECISIONS — QC only ───────────────────────────────────
    @PostMapping("/decisions/bulk")
    @PreAuthorize("hasAuthority('QC')")
    @Operation(summary = "Approve / reject / hold all items in a batch")
    public ResponseEntity<ApiResponse<QcDecisionResponse>> bulkDecision(
            @RequestBody BulkQcDecisionRequest req,
            @RequestParam(defaultValue = "false") boolean generatePdf) {
        QcDecisionResponse resp = inspectionService.bulkDecision(req, generatePdf);
        return ResponseEntity.ok(ApiResponse.success("QC decision recorded", resp));
    }

    @PostMapping("/decisions/per-item")
    @PreAuthorize("hasAuthority('QC')")
    @Operation(summary = "Submit per-item decisions")
    public ResponseEntity<ApiResponse<QcDecisionResponse>> perItemDecision(
            @RequestBody PerItemQcDecisionRequest req,
            @RequestParam(defaultValue = "false") boolean generatePdf) {
        QcDecisionResponse resp = inspectionService.perItemDecision(req, generatePdf);
        return ResponseEntity.ok(ApiResponse.success("QC decisions recorded", resp));
    }

    // ── FILLED CHECKLIST ──────────────────────────────────────
    // ★ Save-on-download: the QC Inspection screen posts here when the
    //   inspector clicks Download, so the filled form is persisted at that
    //   moment. No separate Save button, and no inspection id needed yet —
    //   the row is a draft keyed by batchId until the decision is submitted.
    @PostMapping("/checklists/draft")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Save the filled checklist for a batch (fired on Download)")
    public ResponseEntity<ApiResponse<FilledChecklistDto>> saveChecklistDraft(
            @RequestBody SaveChecklistRequest req) {
        FilledChecklistDto dto = filledChecklistService.saveDraft(
                req.getBatchId(), req.getTemplateCode(), req.getResults());
        return ResponseEntity.ok(ApiResponse.success("Checklist saved", dto));
    }

    // ★ Read the draft back if the inspector reloads mid-inspection.
    @GetMapping("/checklists/draft/{batchId}")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Get the saved checklist draft for a batch")
    public ResponseEntity<ApiResponse<FilledChecklistDto>> getChecklistDraft(
            @PathVariable Long batchId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Checklist draft", filledChecklistService.findDraftForBatch(batchId)));
    }

    // ★ This is what makes the Approved / Rejected screens show the real
    //   entered data instead of an empty form.
    @GetMapping("/inspections/{inspectionId}/checklist")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Get the saved filled checklist for an inspection")
    public ResponseEntity<ApiResponse<FilledChecklistDto>> getChecklist(
            @PathVariable Long inspectionId) {
        return ResponseEntity.ok(ApiResponse.success(
                "Filled checklist", filledChecklistService.findForInspection(inspectionId)));
    }

    // ── PDF DOWNLOAD ──────────────────────────────────────────
    @GetMapping("/inspections/{inspectionId}/pdf")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Download filled inspection PDF")
    public ResponseEntity<byte[]> downloadPdf(
            @PathVariable Long inspectionId) throws Exception {
        QcInspection insp = inspectionRepo.findById(inspectionId)
                .orElseThrow(() -> QcException.notFound("Inspection " + inspectionId + " not found"));
        if (insp.getPdfPath() == null)
            throw QcException.notFound("PDF not yet generated for inspection " + inspectionId);
        byte[] bytes    = Files.readAllBytes(Path.of(insp.getPdfPath()));
        String fileName = "QC-Inspection-" + inspectionId + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(bytes);
    }
}