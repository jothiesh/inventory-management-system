package com.company.inventory.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.AuditLog;
import com.company.inventory.service.AuditService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for Audit Logs
 * Owner-only endpoints for viewing system audit trail
 */
@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('OWNER')")
@Slf4j // <-- Injected for high-fidelity security audit diagnostics
public class AuditController {

    private final AuditService auditService;

    /**
     * Get recent audit logs
     * GET /api/audit/recent?limit=50
     */
    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getRecentLogs(
            @RequestParam(defaultValue = "50") int limit) {
        log.info("REST Request received: GET /api/audit/recent | Querying recent trail records. Cap limit boundary: {}", limit);
        
        List<AuditLog> logs = auditService.getRecentAuditLogs(limit);
        log.debug("Successfully extracted {} recent structural audit logs entries.", logs.size());
        return ResponseEntity.ok(new ApiResponse<>(true, "Recent audit logs retrieved", logs));
    }

    /**
     * Get audit logs by user
     * GET /api/audit/user/{userId}?page=0&size=20
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getLogsByUser(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.info("REST Request received: GET /api/audit/user/{} | Pulling paginated activity matrix for User ID index. [Page: {}, Size: {}]", userId, page, size);
        
        Page<AuditLog> logs = auditService.getAuditLogsByUser(userId, page, size);
        return ResponseEntity.ok(new ApiResponse<>(true, "User audit logs retrieved", logs));
    }

    /**
     * Get audit logs by table
     * GET /api/audit/table/products?page=0&size=20
     */
    @GetMapping("/table/{tableName}")
    public ResponseEntity<ApiResponse<Page<AuditLog>>> getLogsByTable(
            @PathVariable String tableName,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.info("REST Request received: GET /api/audit/table/{} | Filtering mutations entries linked to table structural layout. [Page: {}, Size: {}]", tableName, page, size);
        
        Page<AuditLog> logs = auditService.getAuditLogsByTable(tableName, page, size);
        return ResponseEntity.ok(new ApiResponse<>(true, "Table audit logs retrieved", logs));
    }

    /**
     * Get audit logs by action
     * GET /api/audit/action/CREATE
     */
    @GetMapping("/action/{action}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByAction(@PathVariable String action) {
        log.info("REST Request received: GET /api/audit/action/{} | Querying transaction parameters matching action descriptor context.", action);
        
        List<AuditLog> logs = auditService.getAuditLogsByAction(action);
        log.debug("Found {} matching history logs nodes for action verb: {}", logs.size(), action);
        return ResponseEntity.ok(new ApiResponse<>(true, "Action audit logs retrieved", logs));
    }

    /**
     * Get record history
     * GET /api/audit/history/products/123
     */
   
    @GetMapping("/history/{tableName}/{recordId}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getRecordHistory(
            @PathVariable String tableName,
            @PathVariable Long recordId) {
        log.info("REST Request received: GET /api/audit/history/{}/{} | Compiling historical track timeline profile for specific entity node.", tableName, recordId);
        
        List<AuditLog> logs = auditService.getRecordHistory(tableName, recordId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Record history retrieved", logs));
    }

    /**
     * Get audit logs by date range
     * GET /api/audit/range?start=2025-01-01T00:00:00&end=2025-01-31T23:59:59
     */
    @GetMapping("/range")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getLogsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        log.info("REST Request received: GET /api/audit/range | Querying time series sequence metrics window parameters: '{}' -> '{}'", start, end);
        
        List<AuditLog> logs = auditService.getAuditLogsByDateRange(start, end);
        log.debug("Range filter query complete. Returning matching history block collection lines count: {}", logs.size());
        return ResponseEntity.ok(ApiResponse.success("Audit logs retrieved", logs));
    }

    /**
     * Get user activity summary
     * GET /api/audit/summary/user/1
     */
    @GetMapping("/summary/user/{userId}")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUserActivitySummary(@PathVariable Long userId) {
        log.trace("REST Request received: GET /api/audit/summary/user/{} | Compiling telemetry statistics for operator profile context.", userId);
        
        Map<String, Long> summary = auditService.getUserActivitySummary(userId);
        return ResponseEntity.ok(new ApiResponse<>(true, "User activity summary retrieved", summary));
    }

    /**
     * Get system activity summary
     * GET /api/audit/summary/system
     */
    @GetMapping("/summary/system")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getSystemActivitySummary() {
        log.info("REST Request received: GET /api/audit/summary/system | Generating global operational activity metric data points charts summary.");
        
        Map<String, Long> summary = auditService.getSystemActivitySummary();
        return ResponseEntity.ok(new ApiResponse<>(true, "System activity summary retrieved", summary));
    }

    /**
     * Export audit logs
     * GET /api/audit/export?start=2025-01-01T00:00:00&end=2025-01-31T23:59:59
     */
    @GetMapping("/export")
    public ResponseEntity<String> exportAuditLogs(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        log.info("REST Request received: GET /api/audit/export | Processing high-volume backup database serializations stream generation. Timeline parameters: '{}' -> '{}'", start, end);
        
        long calculationStartTime = System.currentTimeMillis();
        String json = auditService.exportAuditLogs(start, end);
        log.debug("JSON data extraction structure built and written neatly inside download attachment buffer in {} ms.", (System.currentTimeMillis() - calculationStartTime));
        
        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .header("Content-Disposition", "attachment; filename=audit_logs.json")
                .body(json);
    }

    /**
     * Cleanup old audit logs (owner only)
     * DELETE /api/audit/cleanup?months=12
     */
    @DeleteMapping("/cleanup")
    public ResponseEntity<ApiResponse<String>> cleanupOldLogs(
            @RequestParam(defaultValue = "12") int months) {
        log.warn("REST Request received: DELETE /api/audit/cleanup | OWNER REQUEST TO PURGE EXPIRED DATA MATRIX OVER {} MONTHS INACTIVITY LIMIT LIMITS!", months);
        
        auditService.cleanupOldLogs(months);
        log.info("Acknowledge status commit handled safely. Structural history columns older than {} months wiped out from schemas layers spaces.", months);
        return ResponseEntity.ok(new ApiResponse<>(true, 
                "Audit logs older than " + months + " months deleted", null));
    }
}