package com.company.inventory.qc.dto;

import lombok.*;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QcDashboardStatsDto {

    // ── Headline counts ────────────────────────────────
    private Long totalInspections;
    private Long pendingCount;
    private Long approvedCount;
    private Long rejectedCount;
    private Long holdCount;
    private Long partialCount;

    // ── Today / week / month ────────────────────────────
    private Long todayCount;
    private Long thisWeekCount;
    private Long thisMonthCount;

    // ── Rates ────────────────────────────────────────────
    private Double approvalRate;
    private Double rejectionRate;

    // ── Avg turnaround (hours from PENDING -> decision) ─
    private Double avgTurnaroundHours;

    // ── Charts data ─────────────────────────────────────

    // Pie: decision distribution
    // [{name: 'APPROVED', value: 42}, {name: 'REJECTED', value: 5}, ...]
    private List<Map<String, Object>> decisionPie;

    // Bar: per-category counts
    // [{category: 'IC', approved: 20, rejected: 2, hold: 1}, ...]
    private List<Map<String, Object>> categoryBar;

    // Line: daily trend for last 30 days
    // [{date: '2026-04-15', approved: 5, rejected: 1, total: 6}, ...]
    private List<Map<String, Object>> dailyTrend;

    // Heatmap: weekday x hour activity (last 90 days)
    // [{weekday: 1, hour: 10, count: 4}, ...]
    private List<Map<String, Object>> activityHeatmap;

    // ── Top performers ─────────────────────────────────
    // Categories with most rejection issues
    private List<Map<String, Object>> topRejectedCategories;

    // Suppliers with worst pass rate
    private List<Map<String, Object>> worstSuppliers;
}
