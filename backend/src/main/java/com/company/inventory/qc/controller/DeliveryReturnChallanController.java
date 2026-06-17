package com.company.inventory.qc.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.qc.entity.DeliveryReturnChallan;
import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.qc.service.DeliveryReturnChallanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/qc/return-challans")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "QC Return Challans", description = "QC Rejection → Supplier Return → Replacement flow")
public class DeliveryReturnChallanController {

    private final DeliveryReturnChallanService dcService;

    // ─────────────────────────────────────────────────────────
    // ★ FIX: role string was 'MANAGER' — the system role is
    //   'STORE_MANAGER' (no ROLE_ prefix). 'MANAGER' never
    //   matched, so store managers got 403 FORBIDDEN.
    //   Now OWNER + STORE_MANAGER + QC can all access.
    // ─────────────────────────────────────────────────────────

    // ── GET all DCs ──────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Get all return challans")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success("Return challans", dcService.getAllDcs()));
    }

    // ── GET DC detail ────────────────────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Get DC detail")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("DC detail", dcService.getDcDetail(id)));
    }

    // ── GET DCs by batch ─────────────────────────────────────
    @GetMapping("/batch/{batchId}")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Get DCs for a batch")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getByBatch(@PathVariable Long batchId) {
        return ResponseEntity.ok(ApiResponse.success("Batch DCs", dcService.getDcsByBatch(batchId)));
    }

    // ── CREATE DC from rejected batch ────────────────────────
    @PostMapping("/batch/{batchId}/create")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Create return challan from rejected batch")
    public ResponseEntity<ApiResponse<Map<String, Object>>> createDc(
            @PathVariable Long batchId,
            @RequestBody(required = false) Map<String, String> body) {
        String remarks = body != null ? body.get("remarks") : null;
        DeliveryReturnChallan dc = dcService.createDc(batchId, remarks);
        return ResponseEntity.ok(ApiResponse.success("Return challan created", dcService.getDcDetail(dc.getId())));
    }

    // ── SEND DC to supplier ──────────────────────────────────
    @PostMapping("/{id}/send")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Mark DC as sent to supplier")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendDc(@PathVariable Long id) {
        dcService.sendDc(id);
        return ResponseEntity.ok(ApiResponse.success("DC marked as sent", dcService.getDcDetail(id)));
    }

    // ── REPLACEMENT RECEIVED ─────────────────────────────────
    @PostMapping("/{id}/replacement-received")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Mark replacement as received — creates new replacement batch")
    public ResponseEntity<ApiResponse<Map<String, Object>>> replacementReceived(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {

        String newInvoiceNo = body != null ? body.get("invoiceNo")    : null;
        String dateStr      = body != null ? body.get("receivedDate") : null;
        LocalDate receivedDate = dateStr != null ? LocalDate.parse(dateStr) : LocalDate.now();

        StockInBatch newBatch = dcService.markReplacementReceived(id, newInvoiceNo, receivedDate);

        Map<String, Object> result = Map.of(
                "message",              "Replacement batch created — now pending QC",
                "replacementBatchId",   newBatch.getId(),
                "replacementBatchRef",  newBatch.getBatchRef(),
                "replacementStatus",    newBatch.getQcStatus()
        );
        return ResponseEntity.ok(ApiResponse.success("Replacement received", result));
    }

    // ── BATCH TIMELINE ───────────────────────────────────────
    @GetMapping("/timeline/{batchId}")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "Get full timeline for a batch (including replacements)")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTimeline(@PathVariable Long batchId) {
        return ResponseEntity.ok(ApiResponse.success("Batch timeline", dcService.getBatchTimeline(batchId)));
    }
}