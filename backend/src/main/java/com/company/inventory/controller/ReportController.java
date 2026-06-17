package com.company.inventory.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.service.DeadStockService;
import com.company.inventory.service.ReportService;
import com.company.inventory.service.StockOutHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Report Controller - All report endpoints
 *
 * ✅ FIX: Method name alignment:
 *    - DeadStockService.getSlowMovingReport()  (NOT getSlowMovingStockReport)
 *    - StockOutHistoryService uses correct field names (transactionType, referenceNumber)
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Reports", description = "Report generation APIs")
@Slf4j
public class ReportController {

    private final DeadStockService deadStockService;
    private final ReportService reportService;
    private final StockOutHistoryService stockOutHistoryService;

    // ============================================
    // Stock Out History Reports
    // ============================================

    @GetMapping("/stock-out-history")
    @Operation(summary = "Stock out history", description = "Get complete stock out transaction history")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getStockOutHistory(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        log.info("REST Request received: GET /api/reports/stock-out-history | Compiling temporal outflow transaction history data map within range parameters: '{}' -> '{}'", startDate, endDate);
        long startQueryTime = System.currentTimeMillis();
        
        List<Map<String, Object>> report = stockOutHistoryService.getStockOutHistory(startDate, endDate);
        
        log.info("Outflow report dataset serialized successfully. Dispatched rows: {} | Calculation duration: {} ms", report.size(), (System.currentTimeMillis() - startQueryTime));
        return ResponseEntity.ok(ApiResponse.success("Stock out history retrieved", report));
    }

    @GetMapping("/stock-out-history/product/{productId}")
    @Operation(summary = "Product stock out history", description = "Get stock out history for specific product")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProductStockOutHistory(
            @PathVariable Long productId) {

        log.info("REST Request received: GET /api/reports/stock-out-history/product/{} | Compiling isolated item history trajectory ledger mapping graphs.", productId);
        List<Map<String, Object>> report = stockOutHistoryService.getProductStockOutHistory(productId);
        return ResponseEntity.ok(ApiResponse.success("Product stock out history retrieved", report));
    }

    @GetMapping("/stock-out-summary")
    @Operation(summary = "Stock out summary", description = "Get stock out summary by date range")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStockOutSummary(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {

        log.info("REST Request received: GET /api/reports/stock-out-summary | Assembling higher level analytical executive outflow counts map data configurations across: '{}' -> '{}'", startDate, endDate);
        Map<String, Object> report = stockOutHistoryService.getStockOutSummary(startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success("Stock out summary generated", report));
    }

    // ============================================
    // Dead & Slow Moving Stock Reports (Lot-wise)
    // ============================================

    @GetMapping("/dead-stock")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Dead stock report (lot-wise)", description = "Lots with no movement for configured stagnation thresholds")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getDeadStockReport() {
        log.info("REST Request received: GET /api/reports/dead-stock | Running warehouse analytics queries to capture completely dead stock lines.");
        List<Map<String, Object>> report = deadStockService.getDeadStockReport();
        return ResponseEntity.ok(ApiResponse.success("Dead stock report generated", report));
    }

    @GetMapping("/slow-moving")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Slow moving stock report (lot-wise)", description = "Lots with reduced velocity profiles within windowed cutoff dates.")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSlowMovingReport() {
        log.info("REST Request received: GET /api/reports/slow-moving | Processing database sweeps to flag deceleration profiles inside storage lots.");
        // ✅ FIX: Method is getSlowMovingReport() NOT getSlowMovingStockReport()
        List<Map<String, Object>> report = deadStockService.getSlowMovingReport();
        return ResponseEntity.ok(ApiResponse.success("Slow moving stock report generated", report));
    }

    // ============================================
    // Standard Reports
    // ============================================

    @GetMapping("/stock-summary")
    @Operation(summary = "Stock summary report", description = "Get overall stock summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStockSummary() {
        log.info("REST Request received: GET /api/reports/stock-summary | Pulling unified application summary baseline counts metadata matrix framework.");
        Map<String, Object> report = reportService.getStockSummaryReport();
        return ResponseEntity.ok(ApiResponse.success("Stock summary generated", report));
    }

    @GetMapping("/category-wise")
    @Operation(summary = "Category-wise stock report", description = "Get stock report by category")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getCategoryWiseReport() {
        log.info("REST Request received: GET /api/reports/category-wise | Constructing financial valuation asset report sorted by catalog fields parameters.");
        List<Map<String, Object>> report = reportService.getCategoryWiseStockReport();
        return ResponseEntity.ok(ApiResponse.success("Category-wise report generated", report));
    }

    @GetMapping("/rack-wise")
    @Operation(summary = "Rack-wise stock report", description = "Get stock report by rack")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getRackWiseReport() {
        log.info("REST Request received: GET /api/reports/rack-wise | Constructing spatial warehouse placement balance inventory sheets reports map.");
        List<Map<String, Object>> report = reportService.getRackWiseStockReport();
        return ResponseEntity.ok(ApiResponse.success("Rack-wise report generated", report));
    }

    @GetMapping("/price-difference")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Price difference report", description = "Products purchased at different prices across suppliers or timeframes")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPriceDifferenceReport() {
        log.info("REST Request received: GET /api/reports/price-difference | Triggering specialized background inflation-deflation variances auditor algorithm mappings layout execution.");
        List<Map<String, Object>> report = reportService.getPriceDifferenceReport();
        return ResponseEntity.ok(ApiResponse.success("Price difference report generated", report));
    }

    @GetMapping("/stock-value")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Stock value report", description = "Get total stock value")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStockValueReport() {
        log.info("REST Request received: GET /api/reports/stock-value | Invoking asset financial capital audit calculations map over active rows balances.");
        Map<String, Object> report = reportService.getStockValueReport();
        return ResponseEntity.ok(ApiResponse.success("Stock value report generated", report));
    }
}