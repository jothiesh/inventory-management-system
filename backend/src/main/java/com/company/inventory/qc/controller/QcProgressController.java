package com.company.inventory.qc.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.Lot;
import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.qc.enums.QcStatus;
import com.company.inventory.qc.repository.StockInBatchRepository;
import com.company.inventory.qc.service.QcStockBridge;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * ★ NEW — QC inspection progress per Stock-In batch.
 *
 * Used by the "My Stock-In Batches" page to render:
 *      🟡 Pending (3/10 done)
 *
 * GET /api/qc/progress/batches
 * Response: { "57": { "total": 10, "decided": 3 }, "58": { ... } }
 *
 * Only PENDING_QC batches are included (finished batches don't need
 * a progress badge). "decided" = lots that already carry a QC
 * decision from a partial per-item submission.
 */
@Slf4j
@RestController
@RequestMapping("/api/qc/progress")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "QC Progress", description = "Inspection progress for partially inspected batches")
public class QcProgressController {

    private final StockInBatchRepository batchRepo;
    private final QcStockBridge stockBridge;

    @GetMapping("/batches")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")
    @Operation(summary = "QC progress (decided/total items) for all PENDING_QC batches")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<Long, Map<String, Integer>>>> getProgress() {

        Map<Long, Map<String, Integer>> result = new HashMap<>();

        List<StockInBatch> pendingBatches =
                batchRepo.findByQcStatusOrderByCreatedAtDesc(QcStatus.PENDING_QC.name());

        for (StockInBatch batch : pendingBatches) {
            try {
                List<Lot> lots = stockBridge.getLotsForBatch(batch.getId());
                int total   = lots.size();
                int decided = (int) lots.stream()
                        .filter(l -> l.getQcDecision() != null && !l.getQcDecision().isBlank())
                        .count();

                Map<String, Integer> p = new HashMap<>();
                p.put("total",   total);
                p.put("decided", decided);
                result.put(batch.getId(), p);
            } catch (Exception e) {
                log.warn("QC progress computation skipped for batch {}: {}", batch.getId(), e.getMessage());
            }
        }

        log.debug("QC progress map built for {} pending batches.", result.size());
        return ResponseEntity.ok(ApiResponse.success("QC progress", result));
    }
}
