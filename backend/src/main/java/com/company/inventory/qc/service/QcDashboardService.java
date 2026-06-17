package com.company.inventory.qc.service;

import com.company.inventory.qc.dto.QcDashboardStatsDto;
import com.company.inventory.qc.enums.QcStatus;
import com.company.inventory.qc.repository.QcInspectionRepository;
import com.company.inventory.qc.repository.StockInBatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class QcDashboardService {

    private final QcInspectionRepository inspectionRepo;
    private final StockInBatchRepository batchRepo;

    public QcDashboardStatsDto getStats() {
        log.info("Initiating complex multidimensional dashboard analytical compilation query pipeline context.");
        long queryStartTimeStamp = System.currentTimeMillis();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek  = startOfToday.minusDays(now.getDayOfWeek().getValue() - 1L);
        LocalDateTime startOfOriginalMonth = startOfToday.withDayOfMonth(1);
        LocalDateTime last30Days   = now.minusDays(30);
        LocalDateTime last90Days   = now.minusDays(90);

        // ── Headline counts ──────────────────────────────
        log.debug("Polling relational schemas baseline structural data counters maps.");
        long totalInspections = inspectionRepo.count();
        long pendingCount  = batchRepo.countByQcStatus(QcStatus.PENDING_QC);

        long approvedCount = inspectionRepo.countByOverallDecision("ACCEPTED");
        long rejectedCount = inspectionRepo.countByOverallDecision("REJECTED");
        long holdCount     = inspectionRepo.countByOverallDecision("HOLD");
        long partialCount  = inspectionRepo.countByOverallDecision("PARTIAL");

        long todayCount = inspectionRepo.countByCreatedAtBetween(startOfToday, now);
        long weekCount  = inspectionRepo.countByCreatedAtBetween(startOfWeek, now);
        long monthCount = inspectionRepo.countByCreatedAtBetween(startOfOriginalMonth, now);

        long completed = approvedCount + rejectedCount + partialCount;
        double approvalRate  = completed == 0 ? 0 : (approvedCount * 100.0 / completed);
        double rejectionRate = completed == 0 ? 0 : ((rejectedCount + partialCount) * 100.0 / completed);

        log.trace("Aggregating temporal duration metrics across active operational histories.");
        Double avgTurnaround = inspectionRepo.findAvgTurnaroundHours(last30Days);
        if (avgTurnaround == null) avgTurnaround = 0.0;

        // Pie
        List<Map<String, Object>> decisionPie = new ArrayList<>();
        decisionPie.add(Map.of("name", "Approved", "value", approvedCount, "color", "#10b981"));
        decisionPie.add(Map.of("name", "Rejected", "value", rejectedCount, "color", "#ef4444"));
        decisionPie.add(Map.of("name", "Partial",  "value", partialCount,  "color", "#f59e0b"));
        decisionPie.add(Map.of("name", "Hold",     "value", holdCount,     "color", "#8b5cf6"));

        // Category bar
        log.trace("Parsing complex relational groupings structures rows matching Category metrics profiles.");
        List<Object[]> catRows = inspectionRepo.findCategoryBreakdown(last30Days);
        Map<String, Map<String, Long>> catMap = new HashMap<>();
        for (Object[] row : catRows) {
            String cat = String.valueOf(row[0]);
            String dec = String.valueOf(row[1]);
            long cnt = ((Number) row[2]).longValue();
            catMap.computeIfAbsent(cat, k -> new HashMap<>()).merge(dec, cnt, Long::sum);
        }
        List<Map<String, Object>> categoryBar = new ArrayList<>();
        for (Map.Entry<String, Map<String, Long>> entry : catMap.entrySet()) {
            Map<String, Object> bar = new HashMap<>();
            bar.put("category", entry.getKey());
            bar.put("approved", entry.getValue().getOrDefault("ACCEPTED", 0L));
            bar.put("rejected", entry.getValue().getOrDefault("REJECTED", 0L));
            bar.put("partial",  entry.getValue().getOrDefault("PARTIAL", 0L));
            bar.put("hold",     entry.getValue().getOrDefault("HOLD", 0L));
            categoryBar.add(bar);
        }

        // Daily trend
        log.trace("Parsing longitudinal chronology arrays to build 30-day dashboard line metrics charts.");
        List<Object[]> trendRows = inspectionRepo.findDailyCounts(last30Days);
        Map<String, Map<String, Long>> dailyMap = new HashMap<>();
        for (Object[] row : trendRows) {
            String date = String.valueOf(row[0]);
            String dec  = String.valueOf(row[1]);
            long cnt    = ((Number) row[2]).longValue();
            dailyMap.computeIfAbsent(date, k -> new HashMap<>()).merge(dec, cnt, Long::sum);
        }
        List<Map<String, Object>> dailyTrend = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDateTime day = now.minusDays(i);
            String date = day.toLocalDate().toString();
            Map<String, Long> d = dailyMap.getOrDefault(date, Map.of());
            Map<String, Object> entry = new HashMap<>();
            entry.put("date", date);
            entry.put("approved", d.getOrDefault("ACCEPTED", 0L));
            entry.put("rejected", d.getOrDefault("REJECTED", 0L));
            entry.put("partial",  d.getOrDefault("PARTIAL", 0L));
            entry.put("hold",     d.getOrDefault("HOLD", 0L));
            long sum = d.values().stream().mapToLong(Long::longValue).sum();
            entry.put("total", sum);
            dailyTrend.add(entry);
        }

        // Heatmap
        log.trace("Decompressing spatial-temporal dense array matrix block units for 90-day activity logs heatmap.");
        List<Object[]> heatRows = inspectionRepo.findActivityHeatmap(last90Days);
        List<Map<String, Object>> activityHeatmap = new ArrayList<>();
        for (Object[] row : heatRows) {
            Map<String, Object> cell = new HashMap<>();
            cell.put("weekday", ((Number) row[0]).intValue());
            cell.put("hour",    ((Number) row[1]).intValue());
            cell.put("count",   ((Number) row[2]).longValue());
            activityHeatmap.add(cell);
        }

        // Top rejected categories
        List<Object[]> topRejRows = inspectionRepo.findTopRejectedCategories(last30Days);
        List<Map<String, Object>> topRejected = new ArrayList<>();
        for (Object[] row : topRejRows) {
            topRejected.add(Map.of(
                "category", String.valueOf(row[0]),
                "rejectedCount", ((Number) row[1]).longValue()
            ));
        }

        // Worst suppliers
        log.trace("Analyzing partner correlation vectors to flag vendors underperforming quality bounds.");
        List<Object[]> worstRows = inspectionRepo.findWorstSuppliers(last30Days);
        List<Map<String, Object>> worstSuppliers = new ArrayList<>();
        for (Object[] row : worstRows) {
            long total = ((Number) row[1]).longValue();
            long rej   = ((Number) row[2]).longValue();
            double rate = total == 0 ? 0 : (rej * 100.0 / total);
            worstSuppliers.add(Map.of(
                "supplier", String.valueOf(row[0]),
                "totalInspections", total,
                "rejectedCount", rej,
                "rejectionRate", Math.round(rate * 10.0) / 10.0
            ));
        }

        log.info("Executive analytical calculations completed safely. Consolidated dataset built in {} ms.", 
                (System.currentTimeMillis() - queryStartTimeStamp));

        return QcDashboardStatsDto.builder()
                .totalInspections(totalInspections)
                .pendingCount(pendingCount)
                .approvedCount(approvedCount)
                .rejectedCount(rejectedCount)
                .holdCount(holdCount)
                .partialCount(partialCount)
                .todayCount(todayCount)
                .thisWeekCount(weekCount)
                .thisMonthCount(monthCount)
                .approvalRate(Math.round(approvalRate * 10.0) / 10.0)
                .rejectionRate(Math.round(rejectionRate * 10.0) / 10.0)
                .avgTurnaroundHours(Math.round(avgTurnaround * 10.0) / 10.0)
                .decisionPie(decisionPie)
                .categoryBar(categoryBar)
                .dailyTrend(dailyTrend)
                .activityHeatmap(activityHeatmap)
                .topRejectedCategories(topRejected)
                .worstSuppliers(worstSuppliers)
                .build();
    }
}