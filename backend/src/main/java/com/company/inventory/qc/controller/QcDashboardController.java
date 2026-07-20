package com.company.inventory.qc.controller;

import com.company.inventory.qc.dto.QcDashboardStatsDto;
import com.company.inventory.qc.service.QcDashboardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * ★ SECURITY FIX — this controller had NO @PreAuthorize. The Javadoc below
 * claimed "Accessible by QC and OWNER roles", but nothing enforced it: any
 * authenticated user could read the full QC dashboard, including supplier
 * rejection rates. A comment is not an access control.
 */
@RestController
@RequestMapping("/api/qc/dashboard")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "QC Dashboard")
@PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER','QC')")   // ★ was unguarded
@Slf4j
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