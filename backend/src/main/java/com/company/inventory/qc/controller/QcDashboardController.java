package com.company.inventory.qc.controller;

import com.company.inventory.qc.dto.QcDashboardStatsDto;
import com.company.inventory.qc.service.QcDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/qc/dashboard")
@RequiredArgsConstructor
@Slf4j // <-- Injected for routing diagnostics
public class QcDashboardController {

    private final QcDashboardService dashboardService;

    /**
     * GET /api/qc/dashboard/stats
     * Returns full dashboard payload: counts, charts, top lists.
     * Accessible by QC and OWNER roles.
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        log.info("REST Request received: GET /api/qc/dashboard/stats | Compiling analytical dashboard trends.");
        
        long startTime = System.currentTimeMillis();
        QcDashboardStatsDto stats = dashboardService.getStats();
        long duration = System.currentTimeMillis() - startTime;
        
        log.info("REST Response dispatched successfully for /api/qc/dashboard/stats. Payload built in {} ms.", duration);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "data", stats
        ));
    }
}