package com.company.inventory.qc.controller;

import com.company.inventory.qc.dto.QcAlertDto;
import com.company.inventory.qc.service.QcAlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/qc/alerts")
@RequiredArgsConstructor
@Slf4j // <-- Injected for routing diagnostics
public class QcAlertController {

    private final QcAlertService alertService;

    /**
     * GET /api/qc/alerts — all alerts, latest first.
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getAll() {
        log.info("REST Request received: GET /api/qc/alerts | Extracting full notifications ledger historical records.");
        List<QcAlertDto> list = alertService.getAll();
        log.debug("Retrieved {} items from alerts service.", list.size());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", list,
                "count", list.size()
        ));
    }

    /**
     * GET /api/qc/alerts/unread — unread alerts only.
     */
    @GetMapping("/unread")
    public ResponseEntity<Map<String, Object>> getUnread() {
        log.info("REST Request received: GET /api/qc/alerts/unread | Filtering system unread alert rows.");
        List<QcAlertDto> list = alertService.getUnread();
        log.debug("Retrieved {} unread items from alerts service.", list.size());
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", list,
                "count", list.size()
        ));
    }

    /**
     * GET /api/qc/alerts/unread/count — just the count for badge.
     */
    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Object>> getUnreadCount() {
        log.trace("REST Request received: GET /api/qc/alerts/unread/count | Polling unread badge counters.");
        long count = alertService.getUnreadCount();
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", Map.of("count", count)
        ));
    }

    /**
     * PUT /api/qc/alerts/{id}/read — mark single as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(@PathVariable("id") Long alertId) {
        log.info("REST Request received: PUT /api/qc/alerts/{}/read | Changing single validation alert visibility context.", alertId);
        boolean ok = alertService.markAsRead(alertId);
        if (!ok) {
            log.warn("PUT mapping execution anomaly context: Alert ID {} was not modified (possibly already read or ID missing).", alertId);
        }
        return ResponseEntity.ok(Map.of(
                "success", ok,
                "alertId", alertId
        ));
    }

    /**
     * PUT /api/qc/alerts/read-all — mark all as read.
     */
    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead() {
        log.info("REST Request received: PUT /api/qc/alerts/read-all | Executing complete notification queue visibility flush.");
        int updated = alertService.markAllAsRead();
        log.info("Bulk acknowledge completed on endpoint. Total rows modified: {}", updated);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "updatedCount", updated
        ));
    }

    /**
     * DELETE /api/qc/alerts/{id} — delete single alert permanently.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteAlert(@PathVariable("id") Long alertId) {
        log.info("DELETE /api/qc/alerts/{} — permanently removing alert.", alertId);
        boolean ok = alertService.deleteAlert(alertId);
        return ResponseEntity.ok(Map.of("success", ok, "alertId", alertId));
    }

    /**
     * DELETE /api/qc/alerts/bulk — delete multiple alerts by IDs.
     */
    @DeleteMapping("/bulk")
    public ResponseEntity<Map<String, Object>> deleteBulk(@RequestBody java.util.List<Long> alertIds) {
        log.info("DELETE /api/qc/alerts/bulk — removing {} alerts.", alertIds.size());
        int count = alertService.deleteAlerts(alertIds);
        return ResponseEntity.ok(Map.of("success", true, "deletedCount", count));
    }
}