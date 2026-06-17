package com.company.inventory.controller;

import com.company.inventory.dto.request.BulkStockInRequest;
import com.company.inventory.dto.request.StockInBatchEditRequest;
import com.company.inventory.dto.request.StockInRequest;
import com.company.inventory.dto.request.StockOutRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.dto.response.BulkStockInResponse;
import com.company.inventory.dto.response.LotDetailResponse;
import com.company.inventory.dto.response.StockInBatchEditResponse;
import com.company.inventory.dto.response.StockedProductResponse;
import com.company.inventory.entity.Lot;
import com.company.inventory.entity.StockMovement;
import com.company.inventory.entity.User;
import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.service.AuthService;
import com.company.inventory.service.LotService;
import com.company.inventory.service.StockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Stock", description = "Stock management APIs")
@Slf4j
public class StockController {

    private final StockService stockService;
    private final LotService lotService;
    private final AuthService authService;

    // ── Stocked Products ──────────────────────────────────────────
    @GetMapping("/stocked-products")
    @Operation(summary = "Get stocked products")
    public ResponseEntity<ApiResponse<List<StockedProductResponse>>> getStockedProducts() {
        log.info("GET /api/stock/stocked-products");
        List<StockedProductResponse> products = stockService.getStockedProducts();
        return ResponseEntity.ok(ApiResponse.success("Stocked products retrieved", products));
    }

    // ── Batch Endpoints (QC Status) ───────────────────────────────
    @GetMapping("/batches/approved")
    public ResponseEntity<ApiResponse<List<StockInBatch>>> getApprovedBatches() {
        return ResponseEntity.ok(ApiResponse.success("Approved batches retrieved",
                stockService.getBatchesByStatus("QC_APPROVED", "PARTIAL_APPROVED")));
    }

    @GetMapping("/batches/rejected")
    public ResponseEntity<ApiResponse<List<StockInBatch>>> getRejectedBatches() {
        return ResponseEntity.ok(ApiResponse.success("Rejected batches retrieved",
                stockService.getBatchesByStatus("QC_REJECTED")));
    }

    @GetMapping("/batches/pending")
    public ResponseEntity<ApiResponse<List<StockInBatch>>> getPendingBatches() {
        return ResponseEntity.ok(ApiResponse.success("Pending batches retrieved",
                stockService.getBatchesByStatus("PENDING_QC")));
    }

    @GetMapping("/batches/all")
    public ResponseEntity<ApiResponse<List<StockInBatch>>> getAllBatches() {
        return ResponseEntity.ok(ApiResponse.success("All batches retrieved",
                stockService.getBatchesByStatus(
                        "PENDING_QC", "QC_APPROVED", "QC_REJECTED", "PARTIAL_APPROVED", "QC_HOLD")));
    }

    @GetMapping("/batches/{batchId}/lots")
    public ResponseEntity<ApiResponse<List<LotDetailResponse>>> getLotsByBatch(@PathVariable Long batchId) {
        log.info("GET /api/stock/batches/{}/lots", batchId);
        return ResponseEntity.ok(ApiResponse.success("Batch lots retrieved",
                stockService.getLotsByBatchId(batchId)));
    }

    // ── Single Stock IN ───────────────────────────────────────────
    @PostMapping("/in")
    @Operation(summary = "Stock IN - single product")
    public ResponseEntity<ApiResponse<Lot>> stockIn(
            @Valid @RequestBody StockInRequest request,
            Authentication authentication) {
        log.info("POST /api/stock/in | Product ID: {}, Qty: {}", request.getProductId(), request.getQuantity());
        User currentUser = authService.getCurrentUser(authentication.getName());
        Lot lot = stockService.stockIn(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Stock added successfully", lot));
    }

    // ── Bulk Stock IN ─────────────────────────────────────────────
    @PostMapping("/in/bulk")
    @Operation(summary = "Bulk Stock IN - multiple products")
    public ResponseEntity<ApiResponse<BulkStockInResponse>> bulkStockIn(
            @Valid @RequestBody BulkStockInRequest request,
            Authentication authentication) {
        log.info("POST /api/stock/in/bulk | Items: {}", request.getItems() != null ? request.getItems().size() : 0);
        User currentUser = authService.getCurrentUser(authentication.getName());
        BulkStockInResponse response = stockService.bulkStockIn(request, currentUser);
        String message = String.format("Bulk stock in: %d success, %d failed",
                response.getSuccessCount(), response.getFailedCount());
        HttpStatus status = response.getFailedCount() == 0 ? HttpStatus.CREATED : HttpStatus.MULTI_STATUS;
        return ResponseEntity.status(status).body(ApiResponse.success(message, response));
    }

    // ── Stock OUT ─────────────────────────────────────────────────
    @PostMapping("/out")
    @Operation(summary = "Stock OUT")
    public ResponseEntity<ApiResponse<String>> stockOut(
            @Valid @RequestBody StockOutRequest request,
            Authentication authentication) {
        log.info("POST /api/stock/out | Product ID: {}, Qty: {}", request.getProductId(), request.getQuantity());
        User currentUser = authService.getCurrentUser(authentication.getName());
        String groupId = stockService.stockOut(request, currentUser);   // ✅ capture group id
        return ResponseEntity.ok(ApiResponse.success("Stock issued successfully", groupId));
    }

    // ── Cancel (reverse) a completed Stock OUT ────────────────────
    @PostMapping("/out/{groupId}/cancel")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER')")
    @Operation(summary = "Cancel (reverse) a completed Stock OUT")
    public ResponseEntity<ApiResponse<String>> cancelStockOut(
            @PathVariable String groupId,
            @RequestParam(required = false) String reason,
            Authentication authentication) {
        log.info("POST /api/stock/out/{}/cancel | reason={}", groupId, reason);
        User user = authService.getCurrentUser(authentication.getName());
        try {
            stockService.cancelStockOut(groupId, user, reason);
            return ResponseEntity.ok(ApiResponse.success("Stock OUT reversed successfully", groupId));
        } catch (com.company.inventory.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            // already reversed
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        }
    }

    // ── Edit a completed Stock OUT (reverse + re-issue) ───────────
    @PutMapping("/out/{groupId}")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER')")
    @Operation(summary = "Edit a completed Stock OUT (reverse + re-issue)")
    public ResponseEntity<ApiResponse<String>> editStockOut(
            @PathVariable String groupId,
            @Valid @RequestBody StockOutRequest request,
            Authentication authentication) {
        log.info("PUT /api/stock/out/{} | new Qty: {}, Type: {}",
                groupId, request.getQuantity(), request.getTransactionType());
        User user = authService.getCurrentUser(authentication.getName());
        try {
            String newGroupId = stockService.editStockOut(groupId, request, user);
            return ResponseEntity.ok(ApiResponse.success("Stock OUT edited successfully", newGroupId));
        } catch (com.company.inventory.exception.ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        }
    }

    // ── Stock Queries ─────────────────────────────────────────────

    /**
     * ✅ FIX: Returns flat lot DTOs instead of raw Lot entities
     * to avoid LazyInitializationException on nested lazy fields.
     * Frontend (StockOut.jsx) only needs: lotId, lotNumber,
     * remainingQuantity, purchasePrice, purchaseDate.
     */
    @GetMapping("/product/{productId}")
    @Operation(summary = "Get current stock")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentStock(@PathVariable Long productId) {
        log.debug("GET /api/stock/product/{}", productId);

        BigDecimal currentStock = stockService.getCurrentStock(productId);
        List<Lot> lots = lotService.getActiveLotsByProduct(productId);

        // ✅ Map to flat DTO — no lazy proxy issues
        List<Map<String, Object>> lotDtos = lots.stream().map(lot -> {
            Map<String, Object> m = new HashMap<>();
            m.put("lotId",             lot.getLotId());
            m.put("lotNumber",         lot.getLotNumber());
            m.put("remainingQuantity", lot.getRemainingQuantity());
            m.put("purchasePrice",     lot.getPurchasePrice());
            m.put("purchaseDate",      lot.getPurchaseDate());
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> response = new HashMap<>();
        response.put("totalStock", currentStock);
        response.put("lots", lotDtos);

        return ResponseEntity.ok(ApiResponse.success("Current stock retrieved", response));
    }

    @GetMapping("/lots/product/{productId}")
    @Operation(summary = "Get lots by product")
    public ResponseEntity<ApiResponse<List<Lot>>> getLotsByProduct(@PathVariable Long productId) {
        log.debug("GET /api/stock/lots/product/{}", productId);
        return ResponseEntity.ok(ApiResponse.success("Lots retrieved",
                lotService.getLotsByProduct(productId)));
    }

    @GetMapping("/lot/{lotId}")
    @Operation(summary = "Get lot by ID")
    public ResponseEntity<ApiResponse<Lot>> getLotById(@PathVariable Long lotId) {
        log.debug("GET /api/stock/lot/{}", lotId);
        return ResponseEntity.ok(ApiResponse.success("Lot retrieved", lotService.getLotById(lotId)));
    }

    // ── Movement Queries ──────────────────────────────────────────
    @GetMapping("/movements/product/{productId}")
    @Operation(summary = "Get stock movements by product")
    public ResponseEntity<ApiResponse<List<StockMovement>>> getMovementsByProduct(@PathVariable Long productId) {
        log.debug("GET /api/stock/movements/product/{}", productId);
        return ResponseEntity.ok(ApiResponse.success("Movements retrieved",
                stockService.getMovementsByProduct(productId)));
    }

    @GetMapping("/movements/lot/{lotId}")
    @Operation(summary = "Get stock movements by lot")
    public ResponseEntity<ApiResponse<List<StockMovement>>> getMovementsByLot(@PathVariable Long lotId) {
        log.debug("GET /api/stock/movements/lot/{}", lotId);
        return ResponseEntity.ok(ApiResponse.success("Movements retrieved",
                stockService.getMovementsByLot(lotId)));
    }

    // ─────────────────────────────────────────────────────────────
    // PATCH /api/stock/batches/{batchId}
    //
    // Edit header fields of a PENDING_QC batch.
    // Only fields present (non-null) in the request body are applied.
    //   200 — updated batch on success
    //   409 — batch is not in PENDING_QC status
    //   404 — batchId does not exist
    // ─────────────────────────────────────────────────────────────
    @PatchMapping("/batches/{batchId}")
    @Operation(summary = "Edit a pending batch (supplier, invoice, date, notes)")
    public ResponseEntity<ApiResponse<StockInBatchEditResponse>> editBatch(
            @PathVariable Long batchId,
            @RequestBody StockInBatchEditRequest request) {

        log.info("PATCH /api/stock/batches/{} | payload={}", batchId, request);
        try {
            StockInBatchEditResponse updated = stockService.editPendingBatch(batchId, request);
            return ResponseEntity.ok(ApiResponse.success("Batch updated successfully", updated));
        } catch (jakarta.persistence.EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            // Batch is not PENDING_QC — cannot edit
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            // Bad supplierId etc.
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }
}